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
import { CHECK_ICON_PATH, COPY_ICON_PATH, svgIcon } from '../ui/icons'

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
