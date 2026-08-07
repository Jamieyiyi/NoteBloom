import type { NoteSummary } from '../types/note'

interface NoteSidebarProps {
  notes: NoteSummary[]
  selectedId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
}

export function NoteSidebar({ notes, selectedId, onSelect, onCreate, onDelete }: NoteSidebarProps) {
  return (
    <aside className="note-sidebar">
      <div className="note-sidebar-header">
        <h1>NoteBloom</h1>
        <button type="button" onClick={onCreate}>
          + 新增筆記
        </button>
      </div>
      <ul className="note-list">
        {notes.map((note) => (
          <li
            key={note.id}
            className={note.id === selectedId ? 'note-list-item active' : 'note-list-item'}
          >
            <button type="button" className="note-list-item-title" onClick={() => onSelect(note.id)}>
              {note.title || 'Untitled'}
            </button>
            <button
              type="button"
              className="note-list-item-delete"
              title="刪除筆記"
              onClick={() => {
                if (window.confirm(`確定要刪除「${note.title || 'Untitled'}」嗎？`)) {
                  onDelete(note.id)
                }
              }}
            >
              ×
            </button>
          </li>
        ))}
        {notes.length === 0 && <li className="note-list-empty">還沒有筆記，點上面新增一篇吧</li>}
      </ul>
    </aside>
  )
}
