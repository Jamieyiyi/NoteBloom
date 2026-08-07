import { useMemo, useRef, useState } from 'react'
import type { PartialBlock } from '@blocknote/core'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import '@blocknote/mantine/style.css'
import type { Note, NoteSummary } from '../types/note'
import { updateNote } from '../api/notesApi'
import { ExportMenu } from './ExportMenu'

const SAVE_DEBOUNCE_MS = 800

interface NoteEditorProps {
  note: Note
  onSaved: (summary: NoteSummary) => void
}

export function NoteEditor({ note, onSaved }: NoteEditorProps) {
  const [title, setTitle] = useState(note.title)
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const saveTimer = useRef<number | undefined>(undefined)

  const initialContent = useMemo<PartialBlock[] | undefined>(() => {
    try {
      const parsed = JSON.parse(note.contentJson)
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : undefined
    } catch {
      return undefined
    }
  }, [note.contentJson])

  const editor = useCreateBlockNote({ initialContent })

  function scheduleSave(nextTitle: string) {
    setStatus('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        const contentJson = JSON.stringify(editor.document)
        const saved = await updateNote(note.id, nextTitle || 'Untitled', contentJson)
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
    scheduleSave(value)
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
        <ExportMenu editor={editor} title={title} />
      </div>
      <BlockNoteView editor={editor} onChange={() => scheduleSave(title)} />
    </div>
  )
}
