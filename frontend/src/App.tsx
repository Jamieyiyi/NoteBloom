import { useEffect, useState } from 'react'
import { createNote, deleteNote, getNote, listNotes } from './api/notesApi'
import { createCategory, deleteCategory, listCategories, updateCategory } from './api/categoriesApi'
import type { Note, NoteSummary } from './types/note'
import type { Category, CategoryFilter } from './types/category'
import { NoteSidebar } from './components/NoteSidebar'
import { NoteEditor } from './components/NoteEditor'
import { BloomToggle } from './components/BloomToggle'
import { useAppTheme } from './ui/useAppTheme'
import './styles/app.css'

export default function App() {
  const [notes, setNotes] = useState<NoteSummary[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [filter, setFilter] = useState<CategoryFilter>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [selectedNote, setSelectedNote] = useState<Note | null>(null)
  const [loading, setLoading] = useState(true)
  const [theme, toggleTheme] = useAppTheme()
  // 已刪除分類 → 它的上一層；讓編輯中的筆記在下次存檔時跟著移過去
  const [categoryRedirects, setCategoryRedirects] = useState<Record<string, string | null>>({})

  useEffect(() => {
    Promise.all([listNotes(), listCategories()])
      .then(([noteList, categoryList]) => {
        setNotes(noteList)
        setCategories(categoryList)
        if (noteList.length > 0) setSelectedId(noteList[0].id)
      })
      .catch(console.error)
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (!selectedId) {
      setSelectedNote(null)
      return
    }
    getNote(selectedId).then(setSelectedNote).catch(console.error)
  }, [selectedId])

  async function handleCreate() {
    // 新筆記放在目前選的分類裡
    const categoryId = filter === 'all' || filter === 'uncategorized' ? null : filter
    const created = await createNote({ title: 'Untitled', content: '', categoryId })
    setNotes((prev) => [toSummary(created), ...prev])
    setSelectedId(created.id)
  }

  async function handleDelete(id: string) {
    await deleteNote(id)
    setNotes((prev) => prev.filter((note) => note.id !== id))
    if (selectedId === id) {
      setSelectedId(null)
    }
  }

  // 點了某篇筆記，之後新增的筆記就放到同一個分類
  function handleSelect(note: NoteSummary) {
    setSelectedId(note.id)
    setFilter(note.categoryId ?? 'uncategorized')
  }

  function handleSaved(summary: NoteSummary) {
    setNotes((prev) => prev.map((note) => (note.id === summary.id ? summary : note)))
  }

  async function handleCreateCategory(name: string, parentId: string | null) {
    const created = await createCategory(name, parentId)
    setCategories((prev) => [...prev, created])
    setFilter(created.id)
  }

  async function handleRenameCategory(id: string, name: string) {
    const current = categories.find((category) => category.id === id)
    const renamed = await updateCategory(id, name, current?.parentId ?? null)
    setCategories((prev) => prev.map((category) => (category.id === id ? renamed : category)))
  }

  // 後端會把子分類和筆記都往上移一層；這裡同步本地狀態
  async function handleDeleteCategory(id: string) {
    const parentId = categories.find((category) => category.id === id)?.parentId ?? null
    await deleteCategory(id)
    setCategories((prev) =>
      prev
        .filter((category) => category.id !== id)
        .map((category) => (category.parentId === id ? { ...category, parentId } : category)),
    )
    setNotes((prev) => prev.map((note) => (note.categoryId === id ? { ...note, categoryId: parentId } : note)))
    setCategoryRedirects((prev) => ({ ...prev, [id]: parentId }))
    if (filter === id) setFilter(parentId ?? 'all')
  }

  return (
    <div className="app-layout">
      <NoteSidebar
        notes={notes}
        categories={categories}
        filter={filter}
        selectedId={selectedId}
        theme={theme}
        onFilterChange={setFilter}
        onSelect={handleSelect}
        onCreate={handleCreate}
        onDelete={handleDelete}
        onCreateCategory={handleCreateCategory}
        onRenameCategory={handleRenameCategory}
        onDeleteCategory={handleDeleteCategory}
      />
      <main className="app-main">
        <div className="app-theme-toggle">
          <BloomToggle theme={theme} onToggle={toggleTheme} />
        </div>
        {loading && <p className="app-hint">載入中…</p>}
        {!loading && selectedNote && (
          <NoteEditor
            key={selectedNote.id}
            note={selectedNote}
            categories={categories}
            categoryRedirects={categoryRedirects}
            theme={theme}
            onSaved={handleSaved}
          />
        )}
        {!loading && !selectedNote && <p className="app-hint">選一篇筆記，或新增一篇開始寫作</p>}
      </main>
    </div>
  )
}

function toSummary(note: Note): NoteSummary {
  return {
    id: note.id,
    title: note.title,
    categoryId: note.categoryId,
    createdAt: note.createdAt,
    updatedAt: note.updatedAt,
  }
}
