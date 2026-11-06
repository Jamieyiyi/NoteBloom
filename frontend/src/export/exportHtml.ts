import { downloadFile } from './downloadFile'
import { renderMarkdown } from './renderMarkdown'
import { buildHtmlDocument } from './buildHtmlDocument'
import { renderMermaidInHtml } from './mermaid'
import type { ExportThemeId } from './themes'

export async function exportHtml(markdown: string, title: string, themeId: ExportThemeId): Promise<void> {
  const documentTitle = title.trim() || 'Untitled'
  const rendered = renderMarkdown(markdown)
  // Diagrams become static SVG (light and dark), so the exported file needs no mermaid
  const body = await renderMermaidInHtml(rendered.html)
  const html = buildHtmlDocument(documentTitle, { ...rendered, html: body }, themeId, true)
  downloadFile(`${title.trim() || 'untitled'}.html`, html, 'text/html')
}
