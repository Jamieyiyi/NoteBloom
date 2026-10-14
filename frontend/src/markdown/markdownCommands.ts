/**
 * 工具列按鈕的 Markdown 編輯指令。全部都是純函式：輸入目前內容與選取範圍，
 * 回傳「要把 [start, end) 換成 text，換完後選取 [selectionStart, selectionEnd)」。
 */

export interface Selection {
  value: string
  start: number
  end: number
}

export interface TextEdit {
  start: number
  end: number
  text: string
  selectionStart: number
  selectionEnd: number
}

/** 粗體、斜體這類左右包住的語法；已經包住時再按一次就取消。 */
export function wrapInline({ value, start, end }: Selection, marker: string, placeholder: string): TextEdit {
  const selected = value.slice(start, end)
  const before = value.slice(start - marker.length, start)
  const after = value.slice(end, end + marker.length)

  if (selected && before === marker && after === marker) {
    return {
      start: start - marker.length,
      end: end + marker.length,
      text: selected,
      selectionStart: start - marker.length,
      selectionEnd: end - marker.length,
    }
  }

  const inner = selected || placeholder
  return {
    start,
    end,
    text: `${marker}${inner}${marker}`,
    selectionStart: start + marker.length,
    selectionEnd: start + marker.length + inner.length,
  }
}

// 行首的區塊語法：標題、引言、待辦、清單
const BLOCK_PREFIX = /^(#{1,6}\s+|>\s?|[-*+]\s+\[[ xX]\]\s+|[-*+]\s+|\d+\.\s+)/

export type LinePrefixKind = 'h1' | 'h2' | 'h3' | 'quote' | 'bullet' | 'numbered' | 'task'

const LINE_PREFIXES: Record<LinePrefixKind, { prefix: (index: number) => string; pattern: RegExp }> = {
  h1: { prefix: () => '# ', pattern: /^#\s+/ },
  h2: { prefix: () => '## ', pattern: /^##\s+/ },
  h3: { prefix: () => '### ', pattern: /^###\s+/ },
  quote: { prefix: () => '> ', pattern: /^>\s?/ },
  bullet: { prefix: () => '- ', pattern: /^[-*+]\s+(?!\[[ xX]\])/ },
  numbered: { prefix: (index) => `${index + 1}. `, pattern: /^\d+\.\s+/ },
  task: { prefix: () => '- [ ] ', pattern: /^[-*+]\s+\[[ xX]\]\s+/ },
}

/**
 * 對選取範圍涵蓋的每一行加上行首語法（會先換掉原本的標題/清單符號）；
 * 每一行都已經是這種語法時再按一次就取消。
 */
export function toggleLinePrefix({ value, start, end }: Selection, kind: LinePrefixKind): TextEdit {
  const { prefix, pattern } = LINE_PREFIXES[kind]
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const searchFrom = end > start && value[end - 1] === '\n' ? end - 1 : end
  const newline = value.indexOf('\n', searchFrom)
  const lineEnd = newline === -1 ? value.length : newline

  const lines = value.slice(lineStart, lineEnd).split('\n')
  const split = lines.map((line) => {
    const indent = /^\s*/.exec(line)?.[0] ?? ''
    return { indent, body: line.slice(indent.length) }
  })
  const removing = split.every(({ body }) => pattern.test(body))

  const text = split
    .map(({ indent, body }, index) =>
      removing ? indent + body.replace(pattern, '') : indent + prefix(index) + body.replace(BLOCK_PREFIX, ''),
    )
    .join('\n')

  return { start: lineStart, end: lineEnd, text, selectionStart: lineStart, selectionEnd: lineStart + text.length }
}

/** 在獨立的段落插入一整塊內容（前後自動補空行），並選取 block 裡 [selectFrom, selectTo) 的位置。 */
function insertBlock({ value, start, end }: Selection, block: string, selectFrom: number, selectTo: number): TextEdit {
  const textBefore = value.slice(0, start)
  const leading = textBefore === '' || textBefore.endsWith('\n\n') ? '' : textBefore.endsWith('\n') ? '\n' : '\n\n'
  const textAfter = value.slice(end)
  const trailing = textAfter.startsWith('\n\n') ? '' : textAfter.startsWith('\n') ? '\n' : textAfter === '' ? '\n' : '\n\n'

  const text = `${leading}${block}${trailing}`
  const offset = start + leading.length
  return { start, end, text, selectionStart: offset + selectFrom, selectionEnd: offset + selectTo }
}

/** 程式碼區塊：有選取文字就把它包進去，沒有就把游標放在區塊中間。 */
export function insertCodeBlock(selection: Selection, language: string): TextEdit {
  const code = selection.value.slice(selection.start, selection.end).replace(/\n$/, '')
  const opening = `\`\`\`${language}\n`
  const block = `${opening}${code}\n\`\`\``
  return insertBlock(selection, block, opening.length, opening.length + code.length)
}

/** rows 是資料列數（不含標題列），會選取第一個標題儲存格方便直接改名。 */
export function insertTable(selection: Selection, rows: number, columns: number): TextEdit {
  const headers = Array.from({ length: columns }, (_, i) => `欄位 ${i + 1}`)
  const headerRow = `| ${headers.join(' | ')} |`
  const separator = `| ${headers.map(() => '---').join(' | ')} |`
  const bodyRow = `| ${headers.map(() => '   ').join(' | ')} |`
  const block = [headerRow, separator, ...Array.from({ length: rows }, () => bodyRow)].join('\n')
  return insertBlock(selection, block, 2, 2 + headers[0].length)
}

export function insertHorizontalRule(selection: Selection): TextEdit {
  return insertBlock(selection, '---', 3, 3)
}

export type CalloutMarker = 'INFO' | 'WARN' | 'ERROR'

/** Callout block: quotes the selected lines, or selects a placeholder when nothing is selected. */
export function insertCallout(selection: Selection, marker: CalloutMarker): TextEdit {
  const selected = selection.value.slice(selection.start, selection.end).replace(/\n$/, '')
  const body = selected || '內容'
  const opening = `> [!${marker}]\n> `
  const block = `${opening}${body.split('\n').join('\n> ')}`
  return selected ? insertBlock(selection, block, 0, block.length) : insertBlock(selection, block, opening.length, block.length)
}

// "## 1. Title", "### 2.3 Title", "### 2.3. Title"; a bare number such as "## 2024 Review" is not treated as numbering
const NUMBERED_HEADING = /^(\s*#{1,6}\s+)(\d+(?:\.\d+)+\.?|\d+\.)(\s+)(.*)$/

/**
 * Enter on a numbered heading starts the next heading with the following number.
 * Enter on a heading that has only the number clears it instead, ending the sequence.
 * Returns null when the cursor line is not a numbered heading.
 */
export function continueNumberedHeading({ value, start, end }: Selection): TextEdit | null {
  if (start !== end) return null
  const lineStart = value.lastIndexOf('\n', start - 1) + 1
  const newline = value.indexOf('\n', start)
  const lineEnd = newline === -1 ? value.length : newline
  const match = NUMBERED_HEADING.exec(value.slice(lineStart, lineEnd))
  if (!match) return null

  const [, hashes, number, space, title] = match
  if (!title.trim()) {
    return { start: lineStart, end: lineEnd, text: '', selectionStart: lineStart, selectionEnd: lineStart }
  }
  // The cursor sits inside the "## 1." prefix: let Enter behave normally
  if (start < lineStart + hashes.length + number.length + space.length) return null

  const text = `\n${hashes}${incrementLastNumber(number)} `
  return { start, end, text, selectionStart: start + text.length, selectionEnd: start + text.length }
}

function incrementLastNumber(number: string): string {
  return number.replace(/(\d+)(\.?)$/, (_, last: string, dot: string) => `${Number(last) + 1}${dot}`)
}

/** 連結 / 圖片：有選取文字就當成顯示文字並選取網址，沒有就選取顯示文字。 */
export function insertLink({ value, start, end }: Selection, image: boolean): TextEdit {
  const selected = value.slice(start, end)
  const label = selected || (image ? '圖片說明' : '連結文字')
  const url = 'https://'
  const opening = image ? '![' : '['
  const text = `${opening}${label}](${url})`
  const labelStart = start + opening.length
  const urlStart = labelStart + label.length + 2
  return selected
    ? { start, end, text, selectionStart: urlStart, selectionEnd: urlStart + url.length }
    : { start, end, text, selectionStart: labelStart, selectionEnd: labelStart + label.length }
}
