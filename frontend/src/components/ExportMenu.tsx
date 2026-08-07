import { exportMarkdown, type MarkdownExportableEditor } from '../export/exportMarkdown'
import { exportHtml, type HtmlExportableEditor } from '../export/exportHtml'

interface ExportMenuProps {
  editor: MarkdownExportableEditor & HtmlExportableEditor
  title: string
}

export function ExportMenu({ editor, title }: ExportMenuProps) {
  return (
    <div className="export-menu">
      <button type="button" onClick={() => exportMarkdown(editor, title)}>
        匯出 Markdown
      </button>
      <button type="button" onClick={() => exportHtml(editor, title)}>
        匯出 HTML
      </button>
    </div>
  )
}
