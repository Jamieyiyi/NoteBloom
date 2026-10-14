import { downloadFile } from './downloadFile'

export function exportMarkdown(markdown: string, title: string): void {
  downloadFile(`${safeFileName(title)}.md`, markdown, 'text/markdown')
}

function safeFileName(title: string): string {
  return title.trim() || 'untitled'
}
