import { useEffect, useRef, useState, type ReactNode, type RefObject } from 'react'
import {
  insertCallout,
  insertCodeBlock,
  insertHorizontalRule,
  insertJianpu,
  insertLink,
  insertTable,
  toggleLinePrefix,
  wrapInline,
  type CalloutMarker,
  type LinePrefixKind,
  type Selection,
  type TextEdit,
} from '../markdown/markdownCommands'
import { applyEdit, readSelection } from '../markdown/applyEdit'
import { ACCEPTED_IMAGE_TYPES } from '../api/imagesApi'

interface MarkdownToolbarProps {
  textareaRef: RefObject<HTMLTextAreaElement | null>
  onChange: (value: string) => void
  /** 從電腦選取的圖片：上傳後插入到游標位置 */
  onUploadImages: (files: File[]) => void
}

const CODE_LANGUAGES = ['bash', 'java', 'javascript', 'typescript', 'json', 'sql', 'yaml', 'python', 'powershell', 'xml', 'dockerfile']
const TABLE_MAX_ROWS = 6
const TABLE_MAX_COLUMNS = 6

const CALLOUTS: readonly { marker: CalloutMarker; label: string }[] = [
  { marker: 'INFO', label: 'ⓘ 資訊' },
  { marker: 'WARN', label: '⚠ 警告' },
  { marker: 'ERROR', label: '⊗ 錯誤' },
]

const JIANPU_HELP: readonly [string, string][] = [
  ['R: / L:', '右手 / 左手，同一行譜的小節會上下對齊'],
  ['1–7  0', '音符、休止符'],
  ["1'  1,", '高八度（上加點）、低八度（下加點）'],
  ['#4  b7', '升、降'],
  ['5_  5__', '八分、十六分音符（減時線）'],
  ['5.  -', '附點、延長一拍'],
  ['[135]', '和弦（同時按）'],
  ['|  ||  |]  |: :|', '小節線、雙縱線、終止線、反覆'],
  ['title: 等', '曲名 title、調 key（1=C）、拍號 time、速度 tempo'],
  ['空一行', '換到下一行譜'],
]

type Popover = 'code' | 'table' | 'quote' | 'image' | 'jianpu' | null

export function MarkdownToolbar({ textareaRef, onChange, onUploadImages }: MarkdownToolbarProps) {
  const [popover, setPopover] = useState<Popover>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

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
        <PopoverButton
          label="❝"
          title="引言 / 提示框"
          open={popover === 'quote'}
          onToggle={() => setPopover(popover === 'quote' ? null : 'quote')}
          onClose={() => setPopover(null)}
        >
          <div className="md-popover-title">引言樣式</div>
          <div className="md-callout-menu">
            <button type="button" onClick={line('quote')}>
              ❝ 一般引言
            </button>
            {CALLOUTS.map(({ marker, label }) => (
              <button
                key={marker}
                type="button"
                className={`md-callout-${marker.toLowerCase()}`}
                onClick={() => run((s) => insertCallout(s, marker))}
              >
                {label}
              </button>
            ))}
          </div>
        </PopoverButton>
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
        <PopoverButton
          label="🖼"
          title="圖片（也可以直接貼上或拖曳圖片到編輯區）"
          open={popover === 'image'}
          onToggle={() => setPopover(popover === 'image' ? null : 'image')}
          onClose={() => setPopover(null)}
        >
          <div className="md-popover-title">插入圖片</div>
          <div className="md-callout-menu">
            <button
              type="button"
              onClick={() => {
                setPopover(null)
                fileInputRef.current?.click()
              }}
            >
              ⬆ 從電腦上傳…
            </button>
            <button type="button" onClick={() => run((s) => insertLink(s, true))}>
              🔗 圖片網址
            </button>
          </div>
          <div className="md-popover-hint">也可以 Ctrl+V 貼上或拖曳圖片</div>
        </PopoverButton>
        <input
          ref={fileInputRef}
          type="file"
          accept={ACCEPTED_IMAGE_TYPES.join(',')}
          multiple
          hidden
          onChange={(event) => {
            const files = Array.from(event.target.files ?? [])
            // Reset so picking the same file again still fires onChange
            event.target.value = ''
            if (files.length > 0) onUploadImages(files)
          }}
        />
        <ToolButton label="―" title="分隔線" onClick={() => run(insertHorizontalRule)} />
        <PopoverButton
          label="♪ 簡譜"
          title="插入簡譜（鋼琴可分右手 / 左手）"
          open={popover === 'jianpu'}
          onToggle={() => setPopover(popover === 'jianpu' ? null : 'jianpu')}
          onClose={() => setPopover(null)}
        >
          <div className="md-popover-title">簡譜寫法</div>
          <table className="md-jianpu-help">
            <tbody>
              {JIANPU_HELP.map(([syntax, meaning]) => (
                <tr key={syntax}>
                  <td>
                    <code>{syntax}</code>
                  </td>
                  <td>{meaning}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="md-callout-menu md-jianpu-insert">
            <button type="button" onClick={() => run(insertJianpu)}>
              ♪ 插入鋼琴範例
            </button>
          </div>
        </PopoverButton>
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
