import { Marked } from 'marked'
import Prism from 'prismjs'
// Prism 語言包有相依順序：clike / javascript / markup 已內建，其餘依賴它們的要排在後面
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-batch'
import 'prismjs/components/prism-powershell'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-groovy'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-jsx'
import 'prismjs/components/prism-tsx'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-toml'
import 'prismjs/components/prism-ini'
import 'prismjs/components/prism-properties'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-nginx'
import 'prismjs/components/prism-diff'
import 'prismjs/components/prism-markdown'
import { makeUniqueSlug, slugify } from './slugify'
import { JIANPU_LANGUAGES, renderJianpu } from './jianpu'
import { CALLOUT_ICON_PATHS, CHECK_ICON_PATH, COPY_ICON_PATH, svgIcon, type CalloutKind } from '../ui/icons'

export interface TocEntry {
  id: string
  text: string
  level: number
}

export interface RenderedMarkdown {
  html: string
  toc: TocEntry[]
}

const marked = new Marked({ gfm: true })

const LANGUAGE_ALIASES: Record<string, string> = {
  sh: 'bash',
  shell: 'bash',
  zsh: 'bash',
  console: 'bash',
  bat: 'batch',
  cmd: 'batch',
  ps: 'powershell',
  ps1: 'powershell',
  pwsh: 'powershell',
  kt: 'kotlin',
  cs: 'csharp',
  py: 'python',
  js: 'javascript',
  ts: 'typescript',
  yml: 'yaml',
  html: 'markup',
  xml: 'markup',
  svg: 'markup',
  dockerfile: 'docker',
  conf: 'nginx',
  md: 'markdown',
}

export function renderMarkdown(markdown: string): RenderedMarkdown {
  const rawHtml = marked.parse(markdown) as string
  const parsed = new DOMParser().parseFromString(rawHtml, 'text/html')
  const toc = injectHeadingIds(parsed)
  decorateCodeBlocks(parsed)
  wrapTables(parsed)
  decorateCallouts(parsed)
  wrapCollapsibleSections(parsed)
  return { html: parsed.body.innerHTML, toc }
}

function injectHeadingIds(parsed: Document): TocEntry[] {
  const used = new Set<string>()
  const toc: TocEntry[] = []

  parsed.querySelectorAll('h1, h2, h3').forEach((heading) => {
    const text = heading.textContent?.trim() ?? ''
    if (!text) return
    const id = makeUniqueSlug(slugify(text), used)
    heading.id = id
    toc.push({ id, text, level: Number(heading.tagName.substring(1)) })
  })

  return toc
}

/** 每個程式碼區塊包成 .code-block：上方標題列顯示語言與複製按鈕，下方是 Prism 高亮後的程式碼。 */
function decorateCodeBlocks(parsed: Document): void {
  parsed.querySelectorAll('pre > code').forEach((code) => {
    const pre = code.parentElement as HTMLElement
    const requested = requestedLanguage(code.className)
    // ```jianpu 區塊是簡譜，畫成樂譜而不是程式碼
    if (requested && JIANPU_LANGUAGES.has(requested)) {
      pre.replaceWith(renderJianpu(code.textContent ?? '', parsed))
      return
    }
    const language = resolveLanguage(requested)

    if (language) {
      const source = code.textContent ?? ''
      code.className = `language-${language}`
      pre.classList.add(`language-${language}`)
      code.innerHTML = Prism.highlight(source, Prism.languages[language], language)
    }

    const block = parsed.createElement('div')
    block.className = 'code-block'
    pre.replaceWith(block)
    block.append(createCodeHeader(parsed, requested ?? 'text'), pre)
  })
}

function wrapTables(parsed: Document): void {
  parsed.querySelectorAll('table').forEach((table) => {
    const wrapper = parsed.createElement('div')
    wrapper.className = 'table-wrap'
    table.replaceWith(wrapper)
    wrapper.append(table)
  })
}

const CALLOUT_KINDS: Record<string, CalloutKind> = {
  INFO: 'info',
  NOTE: 'info',
  WARN: 'warn',
  WARNING: 'warn',
  ERROR: 'error',
  DANGER: 'error',
  CAUTION: 'error',
}

const CALLOUT_LABELS: Record<CalloutKind, string> = { info: '資訊', warn: '警告', error: '錯誤' }

const CALLOUT_MARKER = /^\s*\[!(\w+)\][ \t]*([^\n]*)\n?/

/**
 * Turns `> [!INFO]`, `> [!WARN]` and `> [!ERROR]` blockquotes into callouts.
 * Text after the marker on the same line replaces the default title.
 */
function decorateCallouts(parsed: Document): void {
  parsed.querySelectorAll('blockquote').forEach((quote) => {
    const paragraph = quote.firstElementChild
    const textNode = paragraph?.tagName === 'P' ? paragraph.firstChild : null
    if (!paragraph || !textNode || textNode.nodeType !== Node.TEXT_NODE) return
    const match = CALLOUT_MARKER.exec(textNode.textContent ?? '')
    const kind = match ? CALLOUT_KINDS[match[1].toUpperCase()] : undefined
    if (!match || !kind) return

    textNode.textContent = (textNode.textContent ?? '').slice(match[0].length)
    if (!paragraph.textContent?.trim() && !paragraph.querySelector('img')) paragraph.remove()

    const title = parsed.createElement('p')
    title.className = 'callout-title'
    title.innerHTML = svgIcon(CALLOUT_ICON_PATHS[kind], 'callout-icon')
    title.append(match[2].trim() || CALLOUT_LABELS[kind])
    quote.classList.add('callout', `callout-${kind}`)
    quote.prepend(title)
  })
}

/** Wraps every H2 / H3 and the content below it in an open <details>, so sections collapse without scripts. */
function wrapCollapsibleSections(parsed: Document): void {
  const h2Sections = wrapSections(parsed, parsed.body, 2)
  ;[parsed.body, ...h2Sections].forEach((container) => wrapSections(parsed, container, 3))
}

/** A section runs from an H{level} heading until the next heading of the same or a higher level. */
function wrapSections(parsed: Document, container: HTMLElement, level: number): HTMLElement[] {
  const sections: HTMLElement[] = []
  let current: HTMLElement | null = null

  Array.from(container.childNodes).forEach((node) => {
    const headingLevel = node instanceof Element ? Number(/^H([1-6])$/.exec(node.tagName)?.[1] ?? 0) : 0
    if (headingLevel && headingLevel <= level) {
      current = null
      if (headingLevel < level) return

      const section = parsed.createElement('details')
      section.className = `nb-section nb-section-h${level}`
      section.open = true
      const summary = parsed.createElement('summary')
      container.insertBefore(section, node)
      summary.append(node)
      section.append(summary)
      sections.push(section)
      current = section
      return
    }
    current?.append(node)
  })

  return sections
}

function requestedLanguage(className: string): string | null {
  const match = /language-(\S+)/.exec(className)
  return match ? match[1].toLowerCase() : null
}

function resolveLanguage(requested: string | null): string | null {
  if (!requested) return null
  const language = LANGUAGE_ALIASES[requested] ?? requested
  return Prism.languages[language] ? language : null
}

function createCodeHeader(parsed: Document, label: string): HTMLElement {
  const header = parsed.createElement('div')
  header.className = 'code-header'
  const lang = parsed.createElement('span')
  lang.className = 'code-lang'
  lang.textContent = label
  const button = parsed.createElement('button')
  button.type = 'button'
  button.className = 'copy-btn'
  button.title = '複製程式碼'
  button.innerHTML = `${svgIcon(COPY_ICON_PATH, 'icon-copy')}${svgIcon(CHECK_ICON_PATH, 'icon-check')}<span>複製</span>`
  header.append(lang, button)
  return header
}
