import type { Category } from '../types/category'

export interface CategoryNode {
  category: Category
  depth: number
  children: CategoryNode[]
}

/** 把平面的分類清單組成樹；depth 從 1 開始。父分類找不到時當成最上層。 */
export function buildCategoryTree(categories: Category[]): CategoryNode[] {
  const ids = new Set(categories.map((category) => category.id))
  const byParent = new Map<string | null, Category[]>()
  for (const category of categories) {
    const parentId = category.parentId && ids.has(category.parentId) ? category.parentId : null
    byParent.set(parentId, [...(byParent.get(parentId) ?? []), category])
  }

  const build = (parentId: string | null, depth: number): CategoryNode[] =>
    (byParent.get(parentId) ?? []).map((category) => ({
      category,
      depth,
      children: build(category.id, depth + 1),
    }))

  return build(null, 1)
}

/** 自己加上所有子孫分類的 id */
export function subtreeIds(node: CategoryNode): string[] {
  return [node.category.id, ...node.children.flatMap(subtreeIds)]
}

/** 依樹狀順序攤平，給下拉選單用：label 是「工作 / 專案A」這種完整路徑 */
export function flattenWithPaths(nodes: CategoryNode[], prefix = ''): { id: string; label: string; depth: number }[] {
  return nodes.flatMap((node) => {
    const label = prefix ? `${prefix} / ${node.category.name}` : node.category.name
    return [{ id: node.category.id, label, depth: node.depth }, ...flattenWithPaths(node.children, label)]
  })
}
