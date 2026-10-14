import { useEffect, useState } from 'react'
import { createNote, deleteNote, getNote, listNotes } from './api/notesApi'
import type { Note, NoteSummary } from './types/note'
import { NoteSidebar } from './components/NoteSidebar'
import { NoteEditor } from './components/NoteEditor'
import { useAppTheme } from './ui/useAppTheme'
import './styles/app.css'

export default function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, toggleTheme] = useAppTheme()

  useEffect(() => {
    refreshList()
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedNote(null)
      return
    }
    getNote(selectedId).then(setSelectedNote).catch(console.error)
  }, [selectedId])

  async function refreshList() {
    setLoading(true)
    try {
      const list = await listNotes()
      setNotes(list)
      if (!selectedId && list.length > 0) {
        setSelectedId(list[0].id)
      }
    } finally {
      setLoading(false)
    }
  }

  async function handleCreate() {
    const created = await createNote('Untitled', '')
    setNotes((prev) => [{ id: created.id, title: created.title, createdAt: created.createdAt, updatedAt: created.updatedAt }, ...prev])
    setSelectedId(created.id)
  }

  async function handleDelete(id: string) {
    await deleteNote(id)
    setNotes((prev) => prev.filter((note) => note.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  function handleSaved(summary: NoteSummary) {
    setNotes((prev) => prev.map((note) => (note.id === summary.id ? summary : note)))
  }

  return (
    <div className="app-layout">
      <NoteSidebar
        notes={notes}
        selectedId={selectedId}
        theme={theme}
        onSelect={setSelectedId}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onToggleTheme={toggleTheme}
      />
      <main className="app-main">
        {loading && <p className="app-hint">載入中…</p>}
        {!loading && selectedNote && <NoteEditor key={selectedNote.id} note={selectedNote} onSaved={handleSaved} />}
        {!loading && !selectedNote && <p className="app-hint">選一篇筆記，或新增一篇開始寫作</p>}
      </main>
    </div>
  )
}
