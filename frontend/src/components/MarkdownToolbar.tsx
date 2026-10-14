import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  insertCodeBlock,
  insertHorizontalRule,
  insertLink,
  insertTable,
  toggleLinePrefix,
  wrapInline,
  type LinePrefixKind,
  type Selection,
  type TextEdit,
} from '../markdown/markdownCommands'
import { applyEdit, readSelection } from '../markdown/applyEdit'

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
}

const CODE_LANGUAGES = ['bash', 'java', 'javascript', 'typescript', 'json', 'sql', 'yaml', 'python', 'powershell', 'xml', 'dockerfile']
const TABLE_MAX_ROWS = 6
const TABLE_MAX_COLUMNS = 6

type Popover = 'code' | 'table' | null

export function MarkdownToolbar({ textareaRef, onChange }: MarkdownToolbarProps) {
  const [popover, setPopover] = useState<Popover>(null)

  function run(command: (selection: Selection) => TextEdit) {
    const textarea = textareaRef.current
    if (!textarea) return
    applyEdit(textarea, command(readSelection(textarea)), onChange)
    setPopover(null)
  }

  const line = (kind: LinePrefixKind) => () => run((s) => toggleLinePrefix(s, kind))
  const inline = (marker: string, placeholder: string) => () => run((s) => wrapInline(s, marker, placeholder))

  return (
    <div className="md-toolbar" role="toolbar" aria-label="Markdown 語法">
      <ToolGroup>
        <ToolButton label="H1" title="大標題" onClick={line('h1')} />
        <ToolButton label="H2" title="中標題" onClick={line('h2')} />
        <ToolButton label="H3" title="小標題" onClick={line('h3')} />
      </ToolGroup>
      <ToolGroup>
        <ToolButton label={<b>B</b>} title="粗體 (Ctrl+B)" onClick={inline('**', '粗體文字')} />
        <ToolButton label={<i>I</i>} title="斜體 (Ctrl+I)" onClick={inline('*', '斜體文字')} />
        <ToolButton label={<s>S</s>} title="刪除線" onClick={inline('~~', '刪除文字')} />
        <ToolButton label={<code>`</code>} title="行內程式碼 (Ctrl+E)" onClick={inline('`', 'code')} />
      </ToolGroup>
      <ToolGroup>
        <ToolButton label="•" title="項目清單" onClick={line('bullet')} />
        <ToolButton label="1." title="編號清單" onClick={line('numbered')} />
        <ToolButton label="☐" title="待辦清單" onClick={line('task')} />
        <ToolButton label="❝" title="引言" onClick={line('quote')} />
      </ToolGroup>
      <ToolGroup>
        <PopoverButton
          label="{ } 程式碼"
          title="插入程式碼區塊"
          open={popover === 'code'}
          onToggle={() => setPopover(popover === 'code' ? null : 'code')}
          onClose={() => setPopover(null)}
        >
          <div className="md-popover-title">選擇語言</div>
          <div className="md-language-grid">
            {CODE_LANGUAGES.map((language) => (
              <button key={language} type="button" onClick={() => run((s) => insertCodeBlock(s, language))}>
                {language}
              </button>
            ))}
            <button type="button" onClick={() => run((s) => insertCodeBlock(s, ''))}>
              純文字
            </button>
          </div>
        </PopoverButton>
        <PopoverButton
          label="⊞ 表格"
          title="插入表格"
          open={popover === 'table'}
          onToggle={() => setPopover(popover === 'table' ? null : 'table')}
          onClose={() => setPopover(null)}
        >
          <TablePicker onPick={(rows, columns) => run((s) => insertTable(s, rows, columns))} />
        </PopoverButton>
        <ToolButton label="🔗" title="連結 (Ctrl+K)" onClick={() => run((s) => insertLink(s, false))} />
        <ToolButton label="🖼" title="圖片" onClick={() => run((s) => insertLink(s, true))} />
        <ToolButton label="―" title="分隔線" onClick={() => run(insertHorizontalRule)} />
      </ToolGroup>
    </div>
  )
}

function ToolGroup({ children }: { children: ReactNode }) {
  return <div className="md-toolbar-group">{children}</div>
}

interface ToolButtonProps {
  label: ReactNode
  title: string
  onClick: () => void
}

function ToolButton({ label, title, onClick }: ToolButtonProps) {
  return (
    // onMouseDown preventDefault：點按鈕時不要讓 textarea 失去選取範圍
    <button type="button" className="md-tool" title={title} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      {label}
    </button>
  )
}

interface PopoverButtonProps {
  label: string
  title: string
  open: boolean
  onToggle: () => void
  onClose: () => void
  children: ReactNode
}

function PopoverButton({ label, title, open, onToggle, onClose, children }: PopoverButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function handlePointer(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) onClose()
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose()
    }
    document.addEventListener('mousedown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('mousedown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [open, onClose])

  return (
    <div className="md-popover-anchor" ref={containerRef}>
      <button
        type="button"
        className={open ? 'md-tool active' : 'md-tool'}
        title={title}
        aria-expanded={open}
        onMouseDown={(e) => e.preventDefault()}
        onClick={onToggle}
      >
        {label} ▾
      </button>
      {open && (
        <div className="md-popover" onMouseDown={(e) => e.preventDefault()}>
          {children}
        </div>
      )}
    </div>
  )
}

function TablePicker({ onPick }: { onPick: (rows: number, columns: number) => void }) {
  const [hover, setHover] = useState({ rows: 2, columns: 3 })

  return (
    <div className="md-table-picker">
      <div className="md-popover-title">
        {hover.rows} 列 × {hover.columns} 欄
      </div>
      <div
        className="md-table-grid"
        style={{ gridTemplateColumns: `repeat(${TABLE_MAX_COLUMNS}, 1fr)` }}
        onMouseLeave={() => setHover({ rows: 2, columns: 3 })}
      >
        {Array.from({ length: TABLE_MAX_ROWS * TABLE_MAX_COLUMNS }, (_, index) => {
          const rows = Math.floor(index / TABLE_MAX_COLUMNS) + 1
          const columns = (index % TABLE_MAX_COLUMNS) + 1
          const active = rows <= hover.rows && columns <= hover.columns
          return (
            <button
              key={index}
              type="button"
              aria-label={`${rows} 列 × ${columns} 欄`}
              className={active ? 'md-table-cell active' : 'md-table-cell'}
              onMouseEnter={() => setHover({ rows, columns })}
              onFocus={() => setHover({ rows, columns })}
              onClick={() => onPick(rows, columns)}
            />
          )
        })}
      </div>
      <div className="md-popover-hint">不含標題列</div>
    </div>
  )
}
