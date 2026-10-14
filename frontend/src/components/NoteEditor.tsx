import { useRef, useState, type KeyboardEvent } from 'react'
import type { Note, NoteSummary } from '../types/note'
import { updateNote } from '../api/notesApi'
import { toMarkdownContent } from '../content/legacyContent'
import { useExportTheme } from '../export/useExportTheme'
import { ExportMenu } from './ExportMenu'
import { MarkdownPreview } from './MarkdownPreview'

const SAVE_DEBOUNCE_MS = 800
const INDENT = '    '

interface NoteEditorProps {
  note: Note
  onSaved: (summary: NoteSummary) => void
}

export function NoteEditor({ note, onSaved }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [content, setContent] = useState(() => toMarkdownContent(note.content))
  const [themeId, setThemeId] = useExportTheme()
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveTimer = useRef<number | undefined>(undefined)

  function scheduleSave(nextTitle: string, nextContent: string) {
    setStatus('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        const saved = await updateNote(note.id, nextTitle || 'Untitled', nextContent)
        setStatus('saved')
        onSaved({ id: saved.id, title: saved.title, createdAt: saved.createdAt, updatedAt: saved.updatedAt })
      } catch (err) {
        console.error('Failed to save note', err)
        setStatus('error')
      }
    }, SAVE_DEBOUNCE_MS)
  }

  function handleTitleChange(value: string) {
    setTitle(value)
    scheduleSave(value, content)
  }

  function handleContentChange(value: string) {
    setContent(value)
    scheduleSave(title, value)
  }

  // Tab 插入縮排而不是跳到下一個欄位；用 insertText 才保留 Ctrl+Z 復原
  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key !== 'Tab' || event.shiftKey || event.ctrlKey || event.altKey) return
    event.preventDefault()
    if (!document.execCommand('insertText', false, INDENT)) {
      const textarea = event.currentTarget
      textarea.setRangeText(INDENT, textarea.selectionStart, textarea.selectionEnd, 'end')
      handleContentChange(textarea.value)
    }
  }

  return (
    <div className="note-editor">
      <div className="note-editor-toolbar">
        <input
          className="note-title-input"
          value={title}
          onChange={(e) => handleTitleChange(e.target.value)}
          placeholder="Untitled"
        />
        <span className="save-status">
          {status === 'saving' ? '儲存中…' : status === 'error' ? '儲存失敗' : '已儲存'}
        </span>
        <ExportMenu markdown={content} title={title} themeId={themeId} onThemeChange={setThemeId} />
      </div>
      <div className="note-editor-panes">
        <textarea
          className="markdown-input"
          value={content}
          onChange={(e) => handleContentChange(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="# 用 Markdown 開始寫作…"
          spellCheck={false}
        />
        <MarkdownPreview markdown={content} themeId={themeId} />
      </div>
    </div>
  )
}
