export interface NoteSummary {
  id: string
  title: string
  categoryId: string | null
  createdAt: string
  updatedAt: string
}

export interface Note extends NoteSummary {
  content: string
}
