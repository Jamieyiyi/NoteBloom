import { exportMarkdown } from '../export/exportMarkdown'
import { exportHtml } from '../export/exportHtml'
import type { ExportThemeId } from '../export/themes'

interface ExportMenuProps {
  markdown: string
  title: string
  /** 匯出時預設的明暗模式（匯出的檔案裡還能自己切換） */
  themeId: ExportThemeId
}

export function ExportMenu({ markdown, title, themeId }: ExportMenuProps) {
  return (
    <div className="export-menu">
      <button type="button" className="export-button" onClick={() => exportMarkdown(markdown, title)}>
        匯出 Markdown
      </button>
      <button
        type="button"
        className="export-button"
        title="以目前的明暗模式匯出；匯出的檔案裡也能自己切換"
        onClick={() => exportHtml(markdown, title, themeId)}
      >
        匯出 HTML
      </button>
    </div>
  )
}
