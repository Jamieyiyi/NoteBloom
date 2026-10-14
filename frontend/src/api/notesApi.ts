import type { Note, NoteSummary } from '../types/note'
import { handle, sendJson } from './http'

const BASE_URL = '/api/notes'

export interface NoteInput {
  title: string
  content: string
  categoryId: string | null
}

export function listNotes(): Promise<NoteSummary[]> {
  return fetch(BASE_URL).then((res) => handle(res))
}

export function getNote(id: string): Promise<Note> {
  return fetch(`${BASE_URL}/${id}`).then((res) => handle(res))
}

export function createNote(input: NoteInput): Promise<Note> {
  return sendJson(BASE_URL, 'POST', input)
}

export function updateNote(id: string, input: NoteInput): Promise<Note> {
  return sendJson(`${BASE_URL}/${id}`, 'PUT', input)
}

export function deleteNote(id: string): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }).then((res) => handle(res))
}
