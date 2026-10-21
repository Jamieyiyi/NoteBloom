import { useDeferredValue, useEffect, useRef, useState } from 'react'
import { renderMarkdown } from '../export/renderMarkdown'
import { buildBodyHtml, buildHtmlDocument } from '../export/buildHtmlDocument'
import type { ExportThemeId } from '../export/themes'
import { withTitleHeading } from '../export/withTitleHeading'
import { copyText } from '../ui/clipboard'

interface MarkdownPreviewProps {
  /** 顯示成最上方的 H1，和匯出結果一致 */
  title: string
  markdown: string
  themeId: ExportThemeId
}

/**
 * 用 iframe 隔離匯出用的 CSS（它會直接改 body 等全域元素），預覽看到的就是匯出的樣子。
 * iframe 只載入一次外殼，之後直接替換內容和 data-theme，打字時捲動位置才不會跳回頂端。
 * sandbox 不含 allow-scripts：筆記裡的 HTML 就算帶 script 也不會在預覽執行。
 * 也因此匯出檔裡負責「複製」按鈕的 script 在預覽裡不會跑，改由這裡（同源的外層頁面）監聽點擊來複製。
 */
export function MarkdownPreview({ title, markdown, themeId }: MarkdownPreviewProps) {
  const frameRef = useRef<HTMLIFrameElement>(null)
  const [ready, setReady] = useState(false)
  const [shell] = useState(() => buildHtmlDocument('Preview', { html: '', toc: [] }, themeId, false))
  const deferredMarkdown = useDeferredValue(withTitleHeading(title, markdown))

  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!ready || !doc) return
    // Re-rendering resets every section to open; restore the ones the reader collapsed
    const collapsed = Array.from(doc.querySelectorAll('details.nb-section:not([open]) > summary > [id]'), (heading) => heading.id)
    doc.body.innerHTML = buildBodyHtml(renderMarkdown(deferredMarkdown), false)
    collapsed.forEach((id) => {
      const section = doc.getElementById(id)?.closest('details')
      if (section) section.open = false
    })
  }, [deferredMarkdown, ready])

  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!ready || !doc) return
    doc.documentElement.dataset.theme = themeId
  }, [themeId, ready])

  // Code blocks are re-rendered on every keystroke, so listen once on the document instead of on each button
  useEffect(() => {
    const doc = frameRef.current?.contentDocument
    if (!ready || !doc) return
    const resetTimers = new Map<Element, number>()

    async function handleClick(event: MouseEvent) {
      const button = (event.target as Element | null)?.closest('.copy-btn')
      const code = button?.closest('.code-block')?.querySelector('pre')
      if (!button || !code) return
      if (!(await copyText(code.textContent ?? ''))) return

      const label = button.querySelector('span')
      button.classList.add('copied')
      if (label) label.textContent = '已複製'
      window.clearTimeout(resetTimers.get(button))
      resetTimers.set(
        button,
        window.setTimeout(() => {
          button.classList.remove('copied')
          if (label) label.textContent = '複製'
          resetTimers.delete(button)
        }, 1500),
      )
    }

    doc.addEventListener('click', handleClick)
    return () => {
      doc.removeEventListener('click', handleClick)
      resetTimers.forEach((timer) => window.clearTimeout(timer))
    }
  }, [ready])

  return (
    <iframe
      ref={frameRef}
      className="markdown-preview"
      title="HTML 預覽"
      sandbox="allow-same-origin"
      srcDoc={shell}
      onLoad={() => setReady(true)}
    />
  )
}
