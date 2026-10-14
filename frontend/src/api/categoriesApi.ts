import type { Category } from '../types/category'
import { handle, sendJson } from './http'

const BASE_URL = '/api/categories'

export function listCategories(): Promise<Category[]> {
  return fetch(BASE_URL).then((res) => handle(res))
}

export function createCategory(name: string, parentId: string | null): Promise<Category> {
  return sendJson(BASE_URL, 'POST', { name, parentId })
}

/** 改名或移動（傳入不同的 parentId） */
export function updateCategory(id: string, name: string, parentId: string | null): Promise<Category> {
  return sendJson(`${BASE_URL}/${id}`, 'PUT', { name, parentId })
}

export function deleteCategory(id: string): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }).then((res) => handle(res))
}
