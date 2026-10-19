/**
 * 筆記標題寫在編輯器最上方，內文不必再打一次 # 標題；預覽與匯出時把標題放回最前面當 H1。
 * 舊筆記內文第一行已經是同樣的 # 標題時就不重複加。
 */
export function withTitleHeading(title: string, markdown: string): string {
  const heading = title.trim()
  if (!heading) return markdown
  const firstLine = markdown.trimStart().split('\n', 1)[0].trim()
  if (firstLine === `# ${heading}`) return markdown
  return `# ${heading}\n\n${markdown}`
}
