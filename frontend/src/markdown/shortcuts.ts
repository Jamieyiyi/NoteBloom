import { insertLink, wrapInline, type Selection, type TextEdit } from './markdownCommands'
import { applyEdit, readSelection } from './applyEdit'

/** 編輯區快捷鍵：Ctrl+B / Ctrl+I / Ctrl+E / Ctrl+K；有處理就回傳 true。 */
export function handleMarkdownShortcut(
  key: string,
  textarea: HTMLTextAreaElement,
  onChange: (value: string) => void,
): boolean {
  const commands: Record<string, (selection: Selection) => TextEdit> = {
    b: (s) => wrapInline(s, '**', '粗體文字'),
    i: (s) => wrapInline(s, '*', '斜體文字'),
    e: (s) => wrapInline(s, '`', 'code'),
    k: (s) => insertLink(s, false),
  }
  const command = commands[key.toLowerCase()]
  if (!command) return false
  applyEdit(textarea, command(readSelection(textarea)), onChange)
  return true
}
