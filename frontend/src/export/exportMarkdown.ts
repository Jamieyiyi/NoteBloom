import { downloadFile } from './downloadFile'

export interface MarkdownExportableEditor {
  blocksToMarkdownLossy(): string
}

export function exportMarkdown(editor: MarkdownExportableEditor, title: string): void {
  const markdown = editor.blocksToMarkdownLossy()
  downloadFile(`${safeFileName(title)}.md`, markdown, 'text/markdown')
}

function safeFileName(title: string): string {
  return title.trim() || 'untitled'
}
