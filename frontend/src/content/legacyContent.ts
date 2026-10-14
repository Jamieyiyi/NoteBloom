/**
 * 舊版筆記是用 BlockNote 編輯器存成 JSON 區塊陣列。改成 Markdown 之後，
 * 讀到舊格式就在這裡轉成 Markdown；使用者下次編輯時會以 Markdown 存回去。
 */

interface LegacyInline {
  type: string
  text?: string
  href?: string
  styles?: Record<string, unknown>
  content?: LegacyInline[]
}

interface LegacyBlock {
  type: string
  props?: Record<string, unknown>
  content?: unknown
  children?: LegacyBlock[]
}

export function toMarkdownContent(stored: string): string {
  if (!stored.trimStart().startsWith('[')) return stored

  let parsed: unknown
  try {
    parsed = JSON.parse(stored)
  } catch {
    return stored
  }
  if (!Array.isArray(parsed) || !parsed.every(isLegacyBlock)) return stored

  return blocksToMarkdown(parsed).trim()
}

function isLegacyBlock(value: unknown): value is LegacyBlock {
  return typeof value === 'object' && value !== null && typeof (value as LegacyBlock).type === 'string'
}

function blocksToMarkdown(blocks: LegacyBlock[]): string {
  return blocks.map(blockToMarkdown).filter((text) => text !== '').join('\n\n')
}

function blockToMarkdown(block: LegacyBlock): string {
  const text = inlineToMarkdown(block.content)
  const props = block.props ?? {}
  let own: string

  switch (block.type) {
    case 'codeBlock': {
      const language = typeof props.language === 'string' ? props.language : ''
      // 把整份 Markdown 貼進程式碼區塊的情況：直接還原成 Markdown 原文
      own = language === 'markdown' ? plainText(block.content) : `\`\`\`${language}\n${plainText(block.content)}\n\`\`\``
      break
    }
    case 'heading':
      own = `${'#'.repeat(Number(props.level) || 1)} ${text}`
      break
    case 'bulletListItem':
      own = `- ${text}`
      break
    case 'numberedListItem':
      own = `1. ${text}`
      break
    case 'checkListItem':
      own = `- [${props.checked ? 'x' : ' '}] ${text}`
      break
    case 'quote':
      own = `> ${text}`
      break
    default:
      own = text
  }

  const children = block.children ?? []
  if (children.length === 0) return own
  const nested = blocksToMarkdown(children)
    .split('\n')
    .map((line) => (line ? `    ${line}` : line))
    .join('\n')
  return `${own}\n\n${nested}`
}

function plainText(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return (content as LegacyInline[]).map((item) => item.text ?? plainText(item.content)).join('')
}

function inlineToMarkdown(content: unknown): string {
  if (!Array.isArray(content)) return ''
  return (content as LegacyInline[])
    .map((item) => {
      if (item.type === 'link') return `[${inlineToMarkdown(item.content)}](${item.href ?? ''})`
      let text = item.text ?? ''
      if (!text) return ''
      const styles = item.styles ?? {}
      if (styles.code) text = `\`${text}\``
      if (styles.bold) text = `**${text}**`
      if (styles.italic) text = `*${text}*`
      if (styles.strike) text = `~~${text}~~`
      return text
    })
    .join('')
}
