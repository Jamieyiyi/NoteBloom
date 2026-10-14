import type { NoteSummary } from '../types/note'
import type { AppTheme } from '../ui/useAppTheme'
import { MOON_ICON_PATH, SUN_ICON_PATH } from '../ui/icons'
import { Icon } from './Icon'

interface NoteSidebarProps {
  notes: NoteSummary[]
  selectedId: string | null
  theme: AppTheme
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onToggleTheme: () => void
}

export function NoteSidebar({ notes, selectedId, theme, onSelect, onCreate, onDelete, onToggleTheme }: NoteSidebarProps) {
  const toggleLabel = theme === 'dark' ? '切換到明亮模式' : '切換到暗黑模式'

  return (
    <aside className="note-sidebar">
      <div className="note-sidebar-header">
        <div className="note-sidebar-brand">
          <h1>NoteBloom</h1>
          <button type="button" className="theme-toggle" title={toggleLabel} aria-label={toggleLabel} onClick={onToggleTheme}>
            <Icon path={theme === 'dark' ? SUN_ICON_PATH : MOON_ICON_PATH} />
          </button>
        </div>
        <button type="button" className="new-note-button" onClick={onCreate}>
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
