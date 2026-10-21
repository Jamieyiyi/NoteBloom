import { useRef, useState, type ReactNode } from 'react'
import type { NoteSummary } from '../types/note'
import { MAX_CATEGORY_DEPTH, type Category, type CategoryFilter } from '../types/category'
import type { AppTheme } from '../ui/useAppTheme'
import { buildCategoryTree, flattenWithPaths, subtreeIds, type CategoryNode } from '../notes/categoryTree'
import logoOnDark from '../assets/logo-on-dark.png'
import logoOnLight from '../assets/logo-on-light.png'
import { PetalIcon, PotIcon, SproutIcon } from './GardenIcons'
import { categoryColors, UNCATEGORIZED_COLOR } from '../ui/gardenColors'
import { Notice } from './Notice'
import { useNotify } from '../ui/notifications'

interface NoteSidebarProps {
  notes: NoteSummary[]
  categories: Category[]
  filter: CategoryFilter
  selectedId: string | null
  theme: AppTheme
  onFilterChange: (filter: CategoryFilter) => void
  onSelect: (note: NoteSummary) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onCreateCategory: (name: string, parentId: string | null) => Promise<void>
  onRenameCategory: (id: string, name: string) => Promise<void>
  onDeleteCategory: (id: string) => Promise<void>
  /** Shown pinned to the bottom of the sidebar (the account menu) */
  footer?: ReactNode
}

/** 樹狀節點共用的狀態與動作，避免每一層都要逐一傳 props */
interface GardenContext extends NoteSidebarProps {
  notesByCategory: Map<string | null, NoteSummary[]>
  categoryNames: Map<string, string>
  /** Flower / petal colour of each category */
  colors: Map<string, string>
  /** Every category starts folded (also right after login) until the reader opens it */
  isCollapsed: (key: CategoryFilter) => boolean
  onBranchClick: (key: CategoryFilter) => void
  expand: (key: CategoryFilter) => void
}

/**
 * 側欄是一座花園：最上面是「全部筆記」，分類是一盆盆開花的盆栽（最多 5 層，每個分類有自己的花色），
 * 筆記是一片片花瓣，顏色跟著所在的分類；沒有分類的筆記是粉紅色花瓣。登入後所有分類都先收起來。
 */
export function NoteSidebar(props: NoteSidebarProps) {
  const { notes, categories, filter, theme, footer, onFilterChange, onCreate, onCreateCategory } = props
  // Only what the reader chose; anything not in here uses its default (see isCollapsed)
  const [collapsed, setCollapsed] = useState<Map<CategoryFilter, boolean>>(new Map())
  const [adding, setAdding] = useState(false)

  const tree = buildCategoryTree(categories)
  const notesByCategory = new Map<string | null, NoteSummary[]>()
  for (const note of notes) {
    notesByCategory.set(note.categoryId, [...(notesByCategory.get(note.categoryId) ?? []), note])
  }
  const categoryNames = new Map(categories.map((category) => [category.id, category.name]))
  const colors = categoryColors(flattenWithPaths(tree).map((entry) => entry.id))
  const targetName = filter === 'all' || filter === 'uncategorized' ? null : categoryNames.get(filter)

  const setFolded = (key: CategoryFilter, folded: boolean) => setCollapsed((prev) => new Map(prev).set(key, folded))
  const expand = (key: CategoryFilter) => setFolded(key, false)
  const isCollapsed = (key: CategoryFilter) => collapsed.get(key) ?? true

  const context: GardenContext = {
    ...props,
    notesByCategory,
    categoryNames,
    colors,
    isCollapsed,
    expand,
    onBranchClick: (key) => {
      if (filter !== key) {
        onFilterChange(key)
        expand(key)
      } else {
        setFolded(key, !isCollapsed(key))
      }
    },
  }

  return (
    <aside className="note-sidebar">
      <div className="note-sidebar-header">
        <div className="note-sidebar-brand">
          <img className="brand-logo" src={theme === 'dark' ? logoOnDark : logoOnLight} alt="NoteBloom" />
        </div>
        <button type="button" className="new-note-button" onClick={onCreate}>
          + 新增筆記{targetName ? <span className="new-note-target">到「{targetName}」</span> : null}
        </button>
      </div>

      <nav className="garden" aria-label="分類與筆記">
        <button
          type="button"
          className={filter === 'all' ? 'garden-root active' : 'garden-root'}
          onClick={() => onFilterChange('all')}
        >
          <span className="garden-root-label">全部筆記</span>
          <span className="sidebar-count">{notes.length}</span>
        </button>

        <ul className="garden-stem">
          {tree.map((node) => (
            <CategoryBranch key={node.category.id} node={node} context={context} />
          ))}
          {/* 沒有分類的筆記直接長在主莖上，不另外包一層「未分類」 */}
          <NoteLeaves notes={notesByCategory.get(null) ?? []} color={UNCATEGORIZED_COLOR} context={context} showEmpty={false} />
          <li className="garden-node garden-add">
            {adding ? (
              <CategoryNameInput
                initial=""
                onSubmit={async (name) => {
                  await onCreateCategory(name, null)
                  setAdding(false)
                }}
                onCancel={() => setAdding(false)}
              />
            ) : (
              <button type="button" className="garden-row garden-add-button" onClick={() => setAdding(true)}>
                <SproutIcon />
                <span>新增分類</span>
              </button>
            )}
          </li>
        </ul>
      </nav>
      {footer ? <div className="note-sidebar-footer">{footer}</div> : null}
    </aside>
  )
}

function CategoryBranch({ node, context }: { node: CategoryNode; context: GardenContext }) {
  const { category, depth, children } = node
  const { filter, notesByCategory, categoryNames, colors, isCollapsed, onBranchClick, expand } = context
  const { onCreateCategory, onRenameCategory, onDeleteCategory } = context
  const [editing, setEditing] = useState(false)
  const [addingChild, setAddingChild] = useState(false)
  const { confirm } = useNotify()

  const ownNotes = notesByCategory.get(category.id) ?? []
  const color = colors.get(category.id) ?? UNCATEGORIZED_COLOR
  const total = subtreeIds(node).reduce((sum, id) => sum + (notesByCategory.get(id)?.length ?? 0), 0)
  const collapsed = isCollapsed(category.id)
  const canAddChild = depth < MAX_CATEGORY_DEPTH

  async function confirmDelete() {
    const destination = category.parentId ? `「${categoryNames.get(category.parentId) ?? '上一層'}」` : '最上層'
    const moving = [
      children.length > 0 ? `${children.length} 個子分類` : null,
      ownNotes.length > 0 ? `${ownNotes.length} 篇筆記` : null,
    ].filter(Boolean)
    const message =
      moving.length > 0
        ? `確定要刪除分類「${category.name}」嗎？裡面的 ${moving.join('和 ')}會移到${destination}，不會被刪除。`
        : `確定要刪除分類「${category.name}」嗎？`
    const confirmed = await confirm({ title: '刪除分類', message, confirmLabel: '刪除', tone: 'warning' })
    if (confirmed) onDeleteCategory(category.id)
  }

  return (
    <li className="garden-node">
      {editing ? (
        <CategoryNameInput
          initial={category.name}
          onSubmit={async (name) => {
            await onRenameCategory(category.id, name)
            setEditing(false)
          }}
          onCancel={() => setEditing(false)}
        />
      ) : (
        <div className={filter === category.id ? 'garden-row garden-branch active' : 'garden-row garden-branch'}>
          <button
            type="button"
            className="garden-row-main"
            aria-expanded={!collapsed}
            onClick={() => onBranchClick(category.id)}
          >
            <span className="garden-pot-wrap">
              <PotIcon color={color} size={depth === 1 ? 20 : 18} />
            </span>
            <span className="garden-label" title={category.name}>{category.name}</span>
            <span className="sidebar-count">{total}</span>
          </button>
          <div className="garden-actions">
            {canAddChild && (
              <button
                type="button"
                title="新增子分類"
                onClick={() => {
                  expand(category.id)
                  setAddingChild(true)
                }}
              >
                +
              </button>
            )}
            <button type="button" title="重新命名" onClick={() => setEditing(true)}>
              ✎
            </button>
            <button type="button" title="刪除分類" onClick={confirmDelete}>
              ×
            </button>
          </div>
        </div>
      )}

      {!collapsed && (
        <ul className="garden-twig">
          {children.map((child) => (
            <CategoryBranch key={child.category.id} node={child} context={context} />
          ))}
          {addingChild && (
            <li className="garden-node">
              <CategoryNameInput
                initial=""
                placeholder="子分類名稱"
                onSubmit={async (name) => {
                  await onCreateCategory(name, category.id)
                  setAddingChild(false)
                }}
                onCancel={() => setAddingChild(false)}
              />
            </li>
          )}
          <NoteLeaves notes={ownNotes} color={color} context={context} showEmpty={children.length === 0 && !addingChild} />
        </ul>
      )}
    </li>
  )
}

interface NoteLeavesProps {
  notes: NoteSummary[]
  /** Petal colour: the flower colour of the category the notes are in */
  color: string
  context: GardenContext
  showEmpty: boolean
}

function NoteLeaves({ notes, color, context, showEmpty }: NoteLeavesProps) {
  const { selectedId, onSelect, onDelete } = context
  const { confirm } = useNotify()

  if (notes.length === 0) {
    return showEmpty ? <li className="garden-node garden-empty">還沒有筆記</li> : null
  }

  return (
    <>
      {notes.map((note) => {
        const selected = note.id === selectedId
        return (
          <li key={note.id} className="garden-node">
            <div className={selected ? 'garden-row garden-note active' : 'garden-row garden-note'}>
              <button type="button" className="garden-row-main" onClick={() => onSelect(note)}>
                <PetalIcon color={color} size={selected ? 16 : 14} />
                <span className="garden-label" title={note.title || 'Untitled'}>{note.title || 'Untitled'}</span>
              </button>
              <div className="garden-actions">
                <button
                  type="button"
                  title="刪除筆記"
                  onClick={async () => {
                    const confirmed = await confirm({
                      title: '刪除筆記',
                      message: `確定要刪除「${note.title || 'Untitled'}」嗎？刪除後無法復原。`,
                      confirmLabel: '刪除',
                      tone: 'warning',
                    })
                    if (confirmed) onDelete(note.id)
                  }}
                >
                  ×
                </button>
              </div>
            </div>
          </li>
        )
      })}
    </>
  )
}

interface CategoryNameInputProps {
  initial: string
  placeholder?: string
  onSubmit: (name: string) => Promise<void>
  onCancel: () => void
}

function CategoryNameInput({ initial, placeholder = '分類名稱', onSubmit, onCancel }: CategoryNameInputProps) {
  const [name, setName] = useState(initial)
  const [error, setError] = useState<string | null>(null)
  // Enter 送出後輸入框失焦又會觸發一次 submit，用這個擋掉重複送出
  const submitting = useRef(false)

  async function submit() {
    if (submitting.current) return
    const trimmed = name.trim()
    if (!trimmed || trimmed === initial) {
      onCancel()
      return
    }
    submitting.current = true
    try {
      await onSubmit(trimmed)
    } catch (err) {
      const message = err instanceof Error ? err.message : ''
      setError(message.includes('already exists') ? '同一層已經有同名的分類' : message.includes('層') ? message : '儲存失敗')
    } finally {
      submitting.current = false
    }
  }

  return (
    <div className="category-input-wrap">
      <input
        className="category-input"
        value={name}
        autoFocus
        placeholder={placeholder}
        maxLength={100}
        onChange={(e) => {
          setName(e.target.value)
          setError(null)
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') submit()
          if (e.key === 'Escape') onCancel()
        }}
        onBlur={() => {
          if (!error) submit()
        }}
      />
      {error && <Notice tone="error">{error}</Notice>}
    </div>
  )
}
