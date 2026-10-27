/**
 * 簡譜（數字譜）：```jianpu 區塊的文字轉成排好的樂譜，鋼琴可以寫右手 / 左手兩行，小節上下對齊。
 *
 *   title: 小星星        曲名        key: C   → 1=C       time: 4/4      tempo: 100 → ♩=100
 *   R: 1 1 5 5 | 6 6 5 - |      右手（R / RH / 右）     L: 1, 5, 3, 5, | …   左手（L / LH / 左）
 *   空一行 = 換到下一行譜；% 開頭是註解
 *
 *   1–7 音符、0 休止      1' 1'' 高八度（上加點）  1, 1,, 低八度（下加點）   #4 b7 升降
 *   5_ 八分、5__ 十六分（下方減時線）  5. 附點   - 延長一拍   [135] 和弦（上下疊）
 *   | 小節線  || 雙縱線  |] 終止線  |: :| 反覆
 *
 * 只用 textContent 組 DOM，筆記內容不會被當成 HTML。
 */

type BarKind = 'single' | 'double' | 'end' | 'repeat-start' | 'repeat-end'

interface Pitch {
  digit: string
  accidental: '#' | 'b' | null
  /** 正數：高幾個八度；負數：低幾個八度 */
  octave: number
}

type Item =
  | { kind: 'note'; pitches: Pitch[]; underlines: number; dotted: boolean }
  | { kind: 'dash' }
  | { kind: 'error'; text: string }

interface Measure {
  items: Item[]
  /** 小節結束的小節線；最後一小節沒寫小節線時是 null */
  bar: BarKind | null
}

interface Voice {
  label: string | null
  /** 開頭就寫 |: 的反覆記號 */
  startsWithRepeat: boolean
  measures: Measure[]
}

interface Score {
  title: string | null
  key: string | null
  time: string | null
  tempo: string | null
  systems: Voice[][]
}

export const JIANPU_LANGUAGES = new Set(['jianpu', '簡譜', '简谱'])

const HEADER = /^(title|key|time|tempo|標題|曲名|調號|拍號|速度)\s*[:：]\s*(.*)$/i
const VOICE = /^(rh|lh|r|l|右手|左手|右|左)\s*[:：]\s*(.*)$/i
const BARS: Record<string, BarKind> = { '|': 'single', '||': 'double', '|]': 'end', '|:': 'repeat-start', ':|': 'repeat-end' }
const NOTE = /^((?:[#b♯♭]?[0-7]['’,，]*)|\[(?:[#b♯♭]?[0-7]['’,，]*)+\])(_{0,3})(\.?)$/
const PITCH = /([#b♯♭]?)([0-7])(['’,，]*)/g

export function parseJianpu(source: string): Score {
  const score: Score = { title: null, key: null, time: null, tempo: null, systems: [] }
  let system: Voice[] = []

  for (const rawLine of source.split('\n')) {
    const line = rawLine.trim()
    if (!line) {
      if (system.length > 0) score.systems.push(system)
      system = []
      continue
    }
    if (line.startsWith('%')) continue

    const header = HEADER.exec(line)
    if (header) {
      const value = header[2].trim()
      const name = header[1].toLowerCase()
      if (name === 'title' || name === '標題' || name === '曲名') score.title = value
      else if (name === 'key' || name === '調號') score.key = value
      else if (name === 'time' || name === '拍號') score.time = value
      else score.tempo = value
      continue
    }

    const voice = VOICE.exec(line)
    const label = voice ? (/^(r|rh|右)/i.test(voice[1]) ? '右' : '左') : null
    system.push(parseVoice(label, voice ? voice[2] : line))
  }
  if (system.length > 0) score.systems.push(system)
  return score
}

function parseVoice(label: string | null, body: string): Voice {
  const tokens = body
    // 和弦裡的空白不算分隔：[1 3 5] 等於 [135]
    .replace(/\[([^\]]*)\]/g, (_, inner: string) => `[${inner.replace(/\s+/g, '')}]`)
    .replace(/(:\||\|:|\|\]|\|\||\|)/g, ' $1 ')
    .split(/\s+/)
    .filter(Boolean)

  const voice: Voice = { label, startsWithRepeat: false, measures: [] }
  let current: Item[] = []
  for (const token of tokens) {
    const bar = BARS[token]
    if (bar) {
      if (current.length === 0 && voice.measures.length === 0 && bar === 'repeat-start') {
        voice.startsWithRepeat = true
      } else {
        voice.measures.push({ items: current, bar })
      }
      current = []
      continue
    }
    current.push(parseItem(token))
  }
  if (current.length > 0) voice.measures.push({ items: current, bar: null })
  return voice
}

function parseItem(token: string): Item {
  if (token === '-' || token === '–' || token === '—') return { kind: 'dash' }
  const match = NOTE.exec(token)
  if (!match) return { kind: 'error', text: token }
  const pitches = Array.from(match[1].matchAll(PITCH), ([, accidental, digit, marks]) => ({
    digit,
    accidental: accidental === '#' || accidental === '♯' ? ('#' as const) : accidental ? ('b' as const) : null,
    octave: [...marks].reduce((sum, mark) => sum + (mark === "'" || mark === '’' ? 1 : -1), 0),
  }))
  // 和弦由高到低往下疊
  pitches.sort((a, b) => b.octave - a.octave || Number(b.digit) - Number(a.digit))
  return { kind: 'note', pitches, underlines: match[2].length, dotted: match[3] === '.' }
}

export function renderJianpu(source: string, doc: Document): HTMLElement {
  const score = parseJianpu(source)
  const root = element(doc, 'div', 'jianpu')

  const meta = [
    score.key ? (score.key.includes('=') ? score.key : `1=${score.key}`) : null,
    score.time,
    score.tempo ? (/^\d+$/.test(score.tempo) ? `♩=${score.tempo}` : score.tempo) : null,
  ].filter((part): part is string => Boolean(part))
  if (score.title || meta.length > 0) {
    const head = element(doc, 'div', 'jianpu-head')
    if (score.title) head.append(element(doc, 'div', 'jianpu-title', score.title))
    if (meta.length > 0) head.append(element(doc, 'div', 'jianpu-meta', meta.join('　')))
    root.append(head)
  }

  if (score.systems.length === 0) {
    root.append(element(doc, 'div', 'jianpu-empty', '還沒有音符：在 R: / L: 後面寫上 1 2 3 …'))
    return root
  }
  for (const system of score.systems) root.append(renderSystem(system, doc))
  return root
}

/** 一行譜：每個小節是一欄，右手、左手各一列，所以上下的小節會對齊 */
function renderSystem(voices: Voice[], doc: Document): HTMLElement {
  const scroller = element(doc, 'div', 'jianpu-system')
  const grid = element(doc, 'div', 'jianpu-grid')
  const hasLabels = voices.some((voice) => voice.label)
  const columns = Math.max(...voices.map((voice) => voice.measures.length), 1)
  grid.style.gridTemplateColumns = `${hasLabels ? 'auto ' : ''}repeat(${columns}, auto)`

  voices.forEach((voice, row) => {
    if (hasLabels) {
      const label = element(doc, 'div', 'jianpu-label', voice.label ?? '')
      label.style.gridRow = String(row + 1)
      grid.append(label)
    }
    for (let index = 0; index < columns; index++) {
      const measure = voice.measures[index]
      const previousBar = index > 0 ? voice.measures[index - 1]?.bar : null
      const classes = ['jianpu-measure']
      if (measure?.bar) classes.push(`bar-${measure.bar}`)
      if (index === 0) classes.push('first')
      if ((index === 0 && voice.startsWithRepeat) || previousBar === 'repeat-start') classes.push('after-repeat-start')
      const cell = element(doc, 'div', classes.join(' '))
      cell.style.gridRow = String(row + 1)
      cell.style.gridColumn = String(index + 1 + (hasLabels ? 1 : 0))
      measure?.items.forEach((item) => cell.append(renderItem(item, doc)))
      grid.append(cell)
    }
  })

  scroller.append(grid)
  return scroller
}

function renderItem(item: Item, doc: Document): HTMLElement {
  if (item.kind === 'error') {
    const error = element(doc, 'span', 'jp-error', item.text)
    error.title = '看不懂的記號'
    return error
  }

  const node = element(doc, 'span', 'jp-item')
  if (item.kind === 'dash') {
    node.append(element(doc, 'span', 'jp-num', '–'), element(doc, 'span', 'jp-lines'), element(doc, 'span', 'jp-lo'))
    return node
  }

  item.pitches.forEach((pitch, index) => {
    const bottom = index === item.pitches.length - 1
    node.append(dots(doc, 'jp-hi', Math.max(pitch.octave, 0)))
    const num = element(doc, 'span', 'jp-num')
    if (pitch.accidental) num.append(element(doc, 'span', 'jp-acc', pitch.accidental === '#' ? '♯' : '♭'))
    num.append(doc.createTextNode(pitch.digit))
    if (bottom && item.dotted) num.append(element(doc, 'span', 'jp-aug', '•'))
    node.append(num)
    // 減時線畫在最下面那個音的下方，低八度的點再放在線的下面
    if (bottom) {
      const lines = element(doc, 'span', 'jp-lines')
      for (let i = 0; i < item.underlines; i++) lines.append(element(doc, 'i', 'jp-line'))
      node.append(lines)
    }
    node.append(dots(doc, 'jp-lo', Math.max(-pitch.octave, 0)))
  })
  return node
}

/** 八度點：兩個以上要上下疊，所以每個點一個元素 */
function dots(doc: Document, className: string, count: number): HTMLElement {
  const holder = element(doc, 'span', className)
  for (let i = 0; i < Math.min(count, 3); i++) holder.append(element(doc, 'span', 'jp-dot', '•'))
  return holder
}

function element(doc: Document, tag: string, className: string, text?: string): HTMLElement {
  const node = doc.createElement(tag)
  node.className = className
  if (text !== undefined) node.textContent = text
  return node
}
