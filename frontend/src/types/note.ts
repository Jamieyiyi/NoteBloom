export interface NoteSummary {
  id: string
  title: string
  createdAt: string
  updatedAt: string
}

export interface Note extends NoteSummary {
  content: string
}
