export interface Category {
  id: string
  name: string
  parentId: string | null
  createdAt: string
}

/** 側欄目前選的位置：全部、未分類，或某個分類的 id（新增筆記會放到這裡） */
export type CategoryFilter = 'all' | 'uncategorized' | string

/** 分類最多幾層，和後端 CategoryModel.MAX_DEPTH 一致 */
export const MAX_CATEGORY_DEPTH = 5
