import { apiFetch } from '../api/http'

/** ](/api/images/{uuid}) — an uploaded image referenced from Markdown image syntax */
const UPLOADED_IMAGE = /\]\((\/api\/images\/[0-9a-f-]{36})\)/g

/**
 * Exported files are opened outside NoteBloom, where /api/images/... needs a login and does not resolve.
 * Replaces those references with data: URLs so the exported file carries its own images.
 * An image that cannot be fetched keeps its original reference.
 */
export async function inlineImages(markdown: string): Promise<string> {
  const urls = [...new Set(Array.from(markdown.matchAll(UPLOADED_IMAGE), (match) => match[1]))]
  if (urls.length === 0) return markdown

  const dataUrls = new Map<string, string>()
  await Promise.all(
    urls.map(async (url) => {
      try {
        const response = await apiFetch(url)
        if (response.ok) dataUrls.set(url, await toDataUrl(await response.blob()))
      } catch {
        // Keep the original reference; the rest of the export still works
      }
    }),
  )
  return markdown.replace(UPLOADED_IMAGE, (whole, url: string) => {
    const dataUrl = dataUrls.get(url)
    return dataUrl ? `](${dataUrl})` : whole
  })
}

function toDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(blob)
  })
}
