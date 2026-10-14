import { exportMarkdown } from '../export/exportMarkdown'
import { exportHtml } from '../export/exportHtml'
import { EXPORT_THEMES, type ExportThemeId } from '../export/themes'

interface ExportMenuProps {
  markdown: string
  title: string
  themeId: ExportThemeId
  onThemeChange: (themeId: ExportThemeId) => void
}

export function ExportMenu({ markdown, title, themeId, onThemeChange }: ExportMenuProps) {
  return (
    <div className="export-menu">
      <span className="export-menu-label">匯出樣式</span>
      <div className="theme-switch" role="radiogroup" aria-label="匯出 HTML 樣式">
        {Object.values(EXPORT_THEMES).map((theme) => (
          <button
            key={theme.id}
            type="button"
            role="radio"
            aria-checked={theme.id === themeId}
            className={theme.id === themeId ? 'active' : undefined}
            onClick={() => onThemeChange(theme.id)}
          >
            {theme.label}
          </button>
        ))}
      </div>
      <button type="button" onClick={() => exportMarkdown(markdown, title)}>
        匯出 Markdown
      </button>
      <button type="button" onClick={() => exportHtml(markdown, title, themeId)}>
        匯出 HTML（{EXPORT_THEMES[themeId].label}）
      </button>
    </div>
  )
}
