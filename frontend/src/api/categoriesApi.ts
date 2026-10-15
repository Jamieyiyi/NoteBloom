import type { Category } from '../types/category'
import { getJson, sendDelete, sendJson } from './http'

const BASE_URL = '/api/categories'

export function listCategories(): Promise<Category[]> {
  return getJson(BASE_URL)
}

export function createCategory(name: string, parentId: string | null): Promise<Category> {
  return sendJson(BASE_URL, 'POST', { name, parentId })
}

/** 改名或移動（傳入不同的 parentId） */
export function updateCategory(id: string, name: string, parentId: string | null): Promise<Category> {
  return sendJson(`${BASE_URL}/${id}`, 'PUT', { name, parentId })
}

export function deleteCategory(id: string): Promise<void> {
  return sendDelete(`${BASE_URL}/${id}`)
}
