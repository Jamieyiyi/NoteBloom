import type { Note, NoteSummary } from '../types/note'

const BASE_URL = '/api/notes'

async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new Error(body.message ?? `Request failed: ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export function listNotes(): Promise<NoteSummary[]> {
  return fetch(BASE_URL).then((res) => handle(res))
}

export function getNote(id: string): Promise<Note> {
  return fetch(`${BASE_URL}/${id}`).then((res) => handle(res))
}

export function createNote(title: string, contentJson: string): Promise<Note> {
  return fetch(BASE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, contentJson }),
  }).then((res) => handle(res))
}

export function updateNote(id: string, title: string, contentJson: string): Promise<Note> {
  return fetch(`${BASE_URL}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title, contentJson }),
  }).then((res) => handle(res))
}

export function deleteNote(id: string): Promise<void> {
  return fetch(`${BASE_URL}/${id}`, { method: 'DELETE' }).then((res) => handle(res))
}
