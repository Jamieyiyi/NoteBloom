import type { Selection, TextEdit } from './markdownCommands'

export function readSelection(textarea: HTMLTextAreaElement): Selection {
  return { value: textarea.value, start: textarea.selectionStart, end: textarea.selectionEnd }
}

/**
 * 把編輯套用到 textarea。優先用 execCommand('insertText')，這樣 Ctrl+Z 可以復原；
 * 瀏覽器不支援時才改用 setRangeText，並自己通知內容變更。
 */
export function applyEdit(textarea: HTMLTextAreaElement, edit: TextEdit, onChange: (value: string) => void): void {
  textarea.focus()
  textarea.setSelectionRange(edit.start, edit.end)
  const inserted = edit.text
    ? document.execCommand('insertText', false, edit.text)
    : document.execCommand('delete')
  if (!inserted) {
    textarea.setRangeText(edit.text, edit.start, edit.end)
    onChange(textarea.value)
  }
  textarea.setSelectionRange(edit.selectionStart, edit.selectionEnd)
}
