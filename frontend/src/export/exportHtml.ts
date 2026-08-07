import { downloadFile } from './downloadFile'
import { makeUniqueSlug, slugify } from './slugify'

export interface HtmlExportableEditor {
  blocksToHTMLLossy(): string
}

interface TocEntry {
  id: string
  text: string
  level: number
}

export function exportHtml(editor: HtmlExportableEditor, title: string): void {
  const rawHtml = editor.blocksToHTMLLossy()
  const { html: contentHtml, toc } = injectHeadingIds(rawHtml)
  const document = buildStandaloneDocument(title.trim() || 'Untitled', contentHtml, toc)
  downloadFile(`${title.trim() || 'untitled'}.html`, document, 'text/html')
}

function injectHeadingIds(html: string): { html: string; toc: TocEntry[] } {
  const parser = new DOMParser()
  const parsed = parser.parseFromString(html, 'text/html')
  const headings = parsed.querySelectorAll('h1, h2, h3')
  const used = new Set<string>()
  const toc: TocEntry[] = []

  headings.forEach((heading) => {
    const text = heading.textContent?.trim() ?? ''
    if (!text) return
    const id = makeUniqueSlug(slugify(text), used)
    heading.id = id
    toc.push({ id, text, level: Number(heading.tagName.substring(1)) })
  })

  return { html: parsed.body.innerHTML, toc }
}

function buildStandaloneDocument(title: string, contentHtml: string, toc: TocEntry[]): string {
  const tocHtml = toc
    .map(
      (entry) =>
        `<li class="toc-level-${entry.level}"><a href="#${entry.id}">${escapeHtml(entry.text)}</a></li>`,
    )
    .join('\n')

  return `<!doctype html>
<html lang="zh-Hant">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<title>${escapeHtml(title)}</title>
<style>
${STYLE}
</style>
</head>
<body>
<button id="nb-theme-toggle" type="button" title="切換深色/淺色模式">🌓</button>
<div class="nb-layout">
  <nav class="nb-toc">
    <div class="nb-toc-title">目錄</div>
    <ul>
${tocHtml}
    </ul>
  </nav>
  <main class="nb-content">
    <h1 class="nb-doc-title">${escapeHtml(title)}</h1>
${contentHtml}
  </main>
</div>
<script>
${SCRIPT}
</script>
</body>
</html>
`
}

function escapeHtml(text: string): string {
  const entities: Record<string, string> = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  }
  return text.replace(/[&<>"']/g, (char) => entities[char])
}

const STYLE = `
:root {
  --nb-bg: #ffffff;
  --nb-bg-alt: #f5f5f7;
  --nb-text: #1a1a1a;
  --nb-text-muted: #6b6b70;
  --nb-border: #e2e2e6;
  --nb-accent: #5b5bd6;
  color-scheme: light;
}
:root[data-theme="dark"] {
  --nb-bg: #1a1a1e;
  --nb-bg-alt: #232328;
  --nb-text: #ececee;
  --nb-text-muted: #a5a5ab;
  --nb-border: #33333a;
  --nb-accent: #8f8fff;
  color-scheme: dark;
}
@media (prefers-color-scheme: dark) {
  :root:not([data-theme="light"]) {
    --nb-bg: #1a1a1e;
    --nb-bg-alt: #232328;
    --nb-text: #ececee;
    --nb-text-muted: #a5a5ab;
    --nb-border: #33333a;
    --nb-accent: #8f8fff;
    color-scheme: dark;
  }
}
* { box-sizing: border-box; }
body {
  margin: 0;
  font-family: -apple-system, "Segoe UI", "PingFang TC", "Microsoft JhengHei", sans-serif;
  background: var(--nb-bg);
  color: var(--nb-text);
  transition: background 0.15s ease, color 0.15s ease;
}
.nb-layout {
  display: flex;
  max-width: 1100px;
  margin: 0 auto;
  min-height: 100vh;
}
.nb-toc {
  width: 240px;
  flex-shrink: 0;
  padding: 32px 16px;
  border-right: 1px solid var(--nb-border);
  position: sticky;
  top: 0;
  align-self: flex-start;
  max-height: 100vh;
  overflow-y: auto;
}
.nb-toc-title {
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.05em;
  text-transform: uppercase;
  color: var(--nb-text-muted);
  margin-bottom: 12px;
}
.nb-toc ul {
  list-style: none;
  margin: 0;
  padding: 0;
}
.nb-toc li {
  margin: 4px 0;
}
.nb-toc a {
  color: var(--nb-text-muted);
  text-decoration: none;
  font-size: 14px;
  line-height: 1.4;
  display: block;
  padding: 2px 0;
}
.nb-toc a:hover {
  color: var(--nb-accent);
}
.nb-toc .toc-level-2 { padding-left: 12px; }
.nb-toc .toc-level-3 { padding-left: 24px; font-size: 13px; }
.nb-content {
  flex: 1;
  min-width: 0;
  padding: 48px 40px 80px;
  line-height: 1.7;
}
.nb-doc-title {
  margin-top: 0;
}
.nb-content h1, .nb-content h2, .nb-content h3 {
  scroll-margin-top: 24px;
}
.nb-content img { max-width: 100%; }
.nb-content pre {
  background: var(--nb-bg-alt);
  padding: 12px 16px;
  border-radius: 8px;
  overflow-x: auto;
}
.nb-content code {
  background: var(--nb-bg-alt);
  padding: 2px 5px;
  border-radius: 4px;
}
#nb-theme-toggle {
  position: fixed;
  top: 16px;
  right: 16px;
  z-index: 10;
  width: 40px;
  height: 40px;
  border-radius: 50%;
  border: 1px solid var(--nb-border);
  background: var(--nb-bg-alt);
  color: var(--nb-text);
  cursor: pointer;
  font-size: 18px;
}
@media (max-width: 720px) {
  .nb-layout { flex-direction: column; }
  .nb-toc {
    width: auto;
    position: static;
    max-height: none;
    border-right: none;
    border-bottom: 1px solid var(--nb-border);
  }
  .nb-content { padding: 32px 20px 60px; }
}
`

const SCRIPT = `
(function () {
  var STORAGE_KEY = 'notebloom-export-theme';
  var root = document.documentElement;
  var toggle = document.getElementById('nb-theme-toggle');
  var saved = null;
  try { saved = localStorage.getItem(STORAGE_KEY); } catch (e) {}
  if (saved === 'dark' || saved === 'light') {
    root.setAttribute('data-theme', saved);
  }
  function currentTheme() {
    var attr = root.getAttribute('data-theme');
    if (attr) return attr;
    return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }
  toggle.addEventListener('click', function () {
    var next = currentTheme() === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem(STORAGE_KEY, next); } catch (e) {}
  });
})();
`
