import type { ExportThemeId } from './themes'

/**
 * Mermaid 圖表：```mermaid 區塊在 renderMarkdown 裡先變成佔位元素（顯示原始碼），
 * 之後再非同步畫成 SVG。mermaid 很大，只有筆記裡真的有圖表時才載入。
 * securityLevel 'strict'：圖表文字裡的 HTML 與 script 都會被清掉。
 *
 * mermaid 會先量文字寬度再決定方塊大小，量的字型、字級、行高必須和顯示的地方（預覽 / 匯出頁，notebloom.css）一樣，
 * 不然量到的比實際顯示的窄，文字就會被裁掉。mermaid 只能在主頁面裡畫，所以在主頁面放一個看不見的量尺寸區
 * （.nb-mermaid-measure，見 app.css），並先載入同樣的網路字型（index.html）。
 */

type Mermaid = typeof import('mermaid').default

export const MERMAID_LANGUAGE = 'mermaid'

const CACHE_LIMIT = 60
/** `${theme}\n${source}` → svg；打字時同一張圖不用一直重畫 */
const cache = new Map<string, string>()
let loading: Promise<Mermaid> | null = null
let configuredTheme: ExportThemeId | null = null
let renderCount = 0
// mermaid 的設定是全域的，一次只畫一張，避免淺色 / 深色互相干擾
let queue: Promise<unknown> = Promise.resolve()

/** renderMarkdown 用：先放原始碼，畫好後換成圖 */
export function createMermaidPlaceholder(doc: Document, source: string): HTMLElement {
  const block = doc.createElement('div')
  block.className = 'mermaid-block'
  block.dataset.source = source
  const pre = doc.createElement('pre')
  pre.className = 'mermaid-source'
  pre.textContent = source
  block.append(pre)
  return block
}

/** 預覽用：把 root 底下還沒畫的圖表畫成目前明暗模式的 SVG（在圖表所在的那份文件裡量尺寸） */
export async function renderMermaidBlocks(root: ParentNode, theme: ExportThemeId): Promise<void> {
  for (const block of pendingBlocks(root)) {
    const source = block.dataset.source ?? ''
    const cached = cache.get(cacheKey(source, theme))
    if (cached) {
      showSvg(block, cached)
      continue
    }
    try {
      const svg = await renderSvg(source, theme)
      // 打字時預覽會整個重建，舊的佔位元素已經不在畫面上就不用填了
      if (block.isConnected) showSvg(block, svg)
    } catch (err) {
      showError(block, err)
    }
  }
}

/**
 * 匯出用：在 HTML 字串裡把圖表畫好，淺色、深色各一份，匯出檔切換明暗時圖也跟著換。
 * 匯出檔因此不需要 mermaid 本身。
 */
export async function renderMermaidInHtml(html: string): Promise<string> {
  if (!html.includes('mermaid-block')) return html
  const doc = new DOMParser().parseFromString(html, 'text/html')
  for (const block of pendingBlocks(doc)) {
    const source = block.dataset.source ?? ''
    try {
      const light = await renderSvg(source, 'light')
      const dark = await renderSvg(source, 'dark')
      block.dataset.rendered = 'true'
      // The source is only needed to draw; the exported file keeps just the pictures
      delete block.dataset.source
      block.innerHTML = `<div class="mermaid-theme mermaid-light">${light}</div><div class="mermaid-theme mermaid-dark">${dark}</div>`
    } catch (err) {
      showError(block, err)
    }
  }
  return doc.body.innerHTML
}

/** Hidden box on the main page whose text settings match the preview / export page; mermaid measures labels in it */
function measuringBox(): HTMLElement {
  let box = document.querySelector<HTMLElement>('.nb-mermaid-measure')
  if (!box) {
    box = document.createElement('div')
    box.className = 'nb-mermaid-measure'
    box.setAttribute('aria-hidden', 'true')
    document.body.append(box)
  }
  return box
}

/**
 * Web fonts only download once text uses them, so ask for them explicitly before measuring.
 * Offline or blocked fonts just fall back, the same way for measuring and for display; never wait more than 3 s.
 */
function fontsLoaded(): Promise<unknown> {
  const loading = Promise.all([document.fonts.load("16px 'Noto Sans TC'", '中文'), document.fonts.load('16px Roboto', 'Aa')]).catch(
    () => undefined,
  )
  return Promise.race([loading, new Promise((resolve) => setTimeout(resolve, 3000))])
}

function pendingBlocks(root: ParentNode): HTMLElement[] {
  return Array.from(root.querySelectorAll<HTMLElement>('.mermaid-block:not([data-rendered])'))
}

function cacheKey(source: string, theme: ExportThemeId): string {
  return `${theme}\n${source}`
}

function renderSvg(source: string, theme: ExportThemeId): Promise<string> {
  const key = cacheKey(source, theme)
  const cached = cache.get(key)
  if (cached) return Promise.resolve(cached)

  const job = queue.then(async () => {
    const [mermaid] = await Promise.all([load(), fontsLoaded()])
    if (configuredTheme !== theme) {
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: 'strict',
        theme: theme === 'dark' ? 'dark' : 'default',
        // Same stack as the preview / export page, so labels are drawn in the font they were measured in
        fontFamily: "'Roboto', 'Noto Sans TC', 'Microsoft JhengHei', 'PingFang TC', sans-serif",
      })
      configuredTheme = theme
    }
    // parse 先檢查語法：語法錯誤時 render 會在頁面上留下錯誤圖，parse 不會
    await mermaid.parse(source)
    const id = `nb-mermaid-${++renderCount}`
    try {
      const { svg } = await mermaid.render(id, source, measuringBox())
      remember(key, svg)
      return svg
    } finally {
      // render 會在量尺寸區暫放一個元素，失敗時可能留下來
      document.getElementById(`d${id}`)?.remove()
    }
  })
  queue = job.catch(() => undefined)
  return job
}

function load(): Promise<Mermaid> {
  loading ??= import('mermaid').then((module) => module.default)
  return loading
}

function remember(key: string, svg: string): void {
  cache.delete(key)
  cache.set(key, svg)
  if (cache.size > CACHE_LIMIT) cache.delete(cache.keys().next().value as string)
}

function showSvg(block: HTMLElement, svg: string): void {
  block.dataset.rendered = 'true'
  block.innerHTML = svg
}

function showError(block: HTMLElement, err: unknown): void {
  block.dataset.rendered = 'error'
  const message = err instanceof Error ? err.message : String(err)
  const note = block.ownerDocument.createElement('div')
  note.className = 'mermaid-error'
  note.textContent = `圖表語法有誤：${message.split('\n').find((line) => line.trim()) ?? message}`
  block.append(note)
}
