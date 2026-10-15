import { useState } from 'react'
import { exportMarkdown } from '../export/exportMarkdown'
import { exportHtml } from '../export/exportHtml'
import { inlineImages } from '../export/inlineImages'
import type { ExportThemeId } from '../export/themes'

interface ExportMenuProps {
  markdown: string
  title: string
  /** 匯出時預設的明暗模式（匯出的檔案裡還能自己切換） */
  themeId: ExportThemeId
}

export function ExportMenu({ markdown, title, themeId }: ExportMenuProps) {
  // Embedding uploaded images takes a moment; block a second click meanwhile
  const [busy, setBusy] = useState(false)

  async function run(exporter: (content: string) => void) {
    setBusy(true)
    try {
      exporter(await inlineImages(markdown))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="export-menu">
      <button
        type="button"
        className="export-button"
        disabled={busy}
        onClick={() => run((content) => exportMarkdown(content, title))}
      >
        匯出 Markdown
      </button>
      <button
        type="button"
        className="export-button"
        title="以目前的明暗模式匯出；匯出的檔案裡也能自己切換"
        disabled={busy}
        onClick={() => run((content) => exportHtml(content, title, themeId))}
      >
        匯出 HTML
      </button>
    </div>
  )
}
