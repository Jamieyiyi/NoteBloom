import { downloadFile } from './downloadFile'
import { renderMarkdown } from './renderMarkdown'
import { buildHtmlDocument } from './buildHtmlDocument'
import type { ExportThemeId } from './themes'

export function exportHtml(markdown: string, title: string, themeId: ExportThemeId): void {
  const documentTitle = title.trim() || 'Untitled'
  const html = buildHtmlDocument(documentTitle, renderMarkdown(markdown), themeId, true)
  downloadFile(`${title.trim() || 'untitled'}.html`, html, 'text/html')
}
