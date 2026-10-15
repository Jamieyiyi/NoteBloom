import { apiFetch, handle } from './http'

const BASE_URL = '/api/images'

/** Same limit as spring.servlet.multipart.max-file-size in application.yml */
export const MAX_IMAGE_BYTES = 10 * 1024 * 1024

/** Formats the server accepts; it checks the actual file content, this list only filters the file picker. */
export const ACCEPTED_IMAGE_TYPES = ['image/png', 'image/jpeg', 'image/gif', 'image/webp']

export interface UploadedImage {
  id: string
  /** Path to reference from the note's Markdown, e.g. /api/images/{id} */
  url: string
}

export function uploadImage(file: File): Promise<UploadedImage> {
  const form = new FormData()
  form.append('file', file, file.name || 'image')
  return apiFetch(BASE_URL, { method: 'POST', body: form }).then((res) => handle<UploadedImage>(res))
}
