import type { Note, NoteSummary } from '../types/note'
import { getJson, sendDelete, sendJson } from './http'

const BASE_URL = '/api/notes'

export interface NoteInput {
  title: string
  content: string
  categoryId: string | null
}

export function listNotes(): Promise<NoteSummary[]> {
  return getJson(BASE_URL)
}

export function getNote(id: string): Promise<Note> {
  return getJson(`${BASE_URL}/${id}`)
}

export function createNote(input: NoteInput): Promise<Note> {
  return sendJson(BASE_URL, 'POST', input)
}

export function updateNote(id: string, input: NoteInput): Promise<Note> {
  return sendJson(`${BASE_URL}/${id}`, 'PUT', input)
}

export function deleteNote(id: string): Promise<void> {
  return sendDelete(`${BASE_URL}/${id}`)
}
