import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react'
import type { Note, NoteSummary } from '../types/note'
import type { Category } from '../types/category'
import type { AppTheme } from '../ui/useAppTheme'
import { updateNote } from '../api/notesApi'
import { MAX_IMAGE_BYTES, uploadImage } from '../api/imagesApi'
import { toMarkdownContent } from '../content/legacyContent'
import { handleMarkdownShortcut } from '../markdown/shortcuts'
import { applyEdit, readSelection } from '../markdown/applyEdit'
import { continueNumberedHeading, insertImages, type ImageReference } from '../markdown/markdownCommands'
import { useStoredChoice } from '../ui/useStoredChoice'
import { reportError, useNotify } from '../ui/notifications'
import { buildCategoryTree, flattenWithPaths } from '../notes/categoryTree'
import { ExportMenu } from './ExportMenu'
import { MarkdownPreview } from './MarkdownPreview'
import { MarkdownToolbar } from './MarkdownToolbar'
import { ViewModeIcon, type ViewMode } from './ViewModeIcon'

const SAVE_DEBOUNCE_MS = 800
const INDENT = '    '

const VIEW_MODES: readonly ViewMode[] = ['edit', 'split', 'preview']
const VIEW_MODE_LABELS: Record<ViewMode, string> = { edit: '編輯', split: '分割', preview: '預覽' }

interface NoteEditorProps {
  note: Note
  categories: Category[]
  /** 已刪除分類 → 它的上一層（null 代表未分類） */
  categoryRedirects: Record<string, string | null>
  /** 預覽與匯出跟著編輯介面的明暗模式 */
  theme: AppTheme
  onSaved: (summary: NoteSummary) => void
}

interface Draft {
  title: string
  content: string
  categoryId: string | null
}

export function NoteEditor({ note, categories, categoryRedirects, theme, onSaved }: NoteEditorProps) {
  const [draft, setDraft] = useState<Draft>(() => ({
    title: note.title,
    content: toMarkdownContent(note.content),
    categoryId: note.categoryId,
  }))
  const [viewMode, setViewMode] = useStoredChoice<ViewMode>('notebloom-view-mode', VIEW_MODES, 'split')
  const [status, setStatus] = useState<'saved' | 'saving' | 'error'>('saved')
  const [uploadingImages, setUploadingImages] = useState(0)
  const saveTimer = useRef<number | undefined>(undefined)
  // Autosave retries on every edit; announce a failure once, and the recovery once
  const saveFailed = useRef(false)
  const notify = useNotify()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  // 分類被刪除後，後端已把筆記移到上一層；這裡跟著換，下次存檔才不會送出已刪除的分類
  const categoryId = resolveCategoryId(draft.categoryId, categories, categoryRedirects)
  const categoryOptions = flattenWithPaths(buildCategoryTree(categories))

  function change(patch: Partial<Draft>, delay = SAVE_DEBOUNCE_MS) {
    const next = { ...draft, categoryId, ...patch }
    setDraft(next)
    setStatus('saving')
    window.clearTimeout(saveTimer.current)
    saveTimer.current = window.setTimeout(async () => {
      try {
        const saved = await updateNote(note.id, { ...next, title: next.title || 'Untitled' })
        setStatus('saved')
        if (saveFailed.current) {
          saveFailed.current = false
          notify.success('筆記已重新儲存')
        }
        onSaved({
          id: saved.id,
          title: saved.title,
          categoryId: saved.categoryId,
          createdAt: saved.createdAt,
          updatedAt: saved.updatedAt,
        })
      } catch (err) {
        if (!saveFailed.current) {
          saveFailed.current = true
          reportError(notify, err, '筆記儲存失敗，會在你繼續編輯時自動重試')
        }
        setStatus('error')
      }
    }, delay)
  }

  const changeContent = (content: string) => change({ content })

  /** 上傳圖片後插入到游標位置；不支援或太大的檔案只提示，不影響其他張。 */
  async function uploadImages(files: File[]) {
    const images = files.filter((file) => file.type.startsWith('image/'))
    const tooLarge = images.filter((file) => file.size > MAX_IMAGE_BYTES)
    if (tooLarge.length > 0) notify.warning(`圖片不能超過 10 MB：${tooLarge.map((file) => file.name).join('、')}`)
    const accepted = images.filter((file) => file.size <= MAX_IMAGE_BYTES)
    if (accepted.length === 0) return

    setUploadingImages((count) => count + accepted.length)
    const uploaded: ImageReference[] = []
    for (const file of accepted) {
      try {
        const { url } = await uploadImage(file)
        uploaded.push({ alt: imageAltText(file.name), url })
      } catch (err) {
        reportError(notify, err, `圖片上傳失敗：${file.name}`)
      } finally {
        setUploadingImages((count) => count - 1)
      }
    }
    const textarea = textareaRef.current
    if (uploaded.length === 0 || !textarea) return
    applyEdit(textarea, insertImages(readSelection(textarea), uploaded), changeContent)
  }

  function handlePaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.clipboardData.files).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    // A copied picture often comes with text/html as well; insert the image, not that markup
    event.preventDefault()
    void uploadImages(files)
  }

  function handleDrop(event: DragEvent<HTMLTextAreaElement>) {
    const files = Array.from(event.dataTransfer.files).filter((file) => file.type.startsWith('image/'))
    if (files.length === 0) return
    event.preventDefault()
    void uploadImages(files)
  }

  function handleKeyDown(event: KeyboardEvent<HTMLTextAreaElement>) {
    const textarea = event.currentTarget
    if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
      if (handleMarkdownShortcut(event.key, textarea, changeContent)) event.preventDefault()
      return
    }
    // Skip while an IME is composing, otherwise confirming a Chinese candidate would insert a heading
    if (event.key === 'Enter' && !event.shiftKey && !event.altKey && !event.nativeEvent.isComposing) {
      const edit = continueNumberedHeading(readSelection(textarea))
      if (edit) {
        event.preventDefault()
        applyEdit(textarea, edit, changeContent)
      }
      return
    }
    // Tab 插入縮排而不是跳到下一個欄位
    if (event.key === 'Tab' && !event.shiftKey && !event.altKey) {
      event.preventDefault()
      const { start, end } = readSelection(textarea)
      applyEdit(textarea, { start, end, text: INDENT, selectionStart: start + INDENT.length, selectionEnd: start + INDENT.length }, changeContent)
    }
  }

  return (
    <div className="note-editor">
      <div className="note-editor-header">
        <input
          className="note-title-input"
          value={draft.title}
          onChange={(e) => change({ title: e.target.value })}
          placeholder="Untitled"
        />
        <span className={status === 'error' ? 'save-status error' : 'save-status'}>
          {uploadingImages > 0
            ? '圖片上傳中…'
            : status === 'saving'
              ? '儲存中…'
              : status === 'error'
                ? '儲存失敗'
                : '已儲存'}
        </span>
        <select
          className="category-select"
          value={categoryId ?? ''}
          aria-label="筆記分類"
          onChange={(e) => change({ categoryId: e.target.value || null }, 0)}
        >
          <option value="">未分類</option>
          {categoryOptions.map((option) => (
            <option key={option.id} value={option.id}>
              {option.label}
            </option>
          ))}
        </select>
        <div className="segmented icon-segmented" role="radiogroup" aria-label="檢視模式">
          {VIEW_MODES.map((mode) => (
            <button
              key={mode}
              type="button"
              role="radio"
              aria-checked={mode === viewMode}
              title={VIEW_MODE_LABELS[mode]}
              aria-label={VIEW_MODE_LABELS[mode]}
              className={mode === viewMode ? 'active' : undefined}
              onClick={() => setViewMode(mode)}
            >
              <ViewModeIcon mode={mode} />
            </button>
          ))}
        </div>
      </div>
      <div className="note-editor-bar">
        {viewMode !== 'preview' ? (
          <MarkdownToolbar textareaRef={textareaRef} onChange={changeContent} onUploadImages={(files) => void uploadImages(files)} />
        ) : (
          <span />
        )}
        <ExportMenu markdown={draft.content} title={draft.title} themeId={theme} />
      </div>
      <div className={`note-editor-panes view-${viewMode}`}>
        {viewMode !== 'preview' && (
          <textarea
            ref={textareaRef}
            className="markdown-input"
            value={draft.content}
            onChange={(e) => changeContent(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            placeholder="# 用 Markdown 開始寫作…"
            spellCheck={false}
          />
        )}
        {viewMode !== 'edit' && <MarkdownPreview markdown={draft.content} themeId={theme} />}
      </div>
    </div>
  )
}

/** 檔名當圖片說明；截圖貼上時檔名通常只是 image.png，就用「圖片」。 */
function imageAltText(fileName: string): string {
  const base = fileName.replace(/\.[^.]+$/, '').trim()
  return !base || base.toLowerCase() === 'image' ? '圖片' : base
}

function resolveCategoryId(
  categoryId: string | null,
  categories: Category[],
  redirects: Record<string, string | null>,
): string | null {
  let current = categoryId
  // 連續刪掉好幾層時要一路往上找；最多 5 層，加上保險避免意外的循環
  for (let hops = 0; current && current in redirects && hops < 10; hops++) {
    current = redirects[current]
  }
  return current && categories.some((category) => category.id === current) ? current : null
}
