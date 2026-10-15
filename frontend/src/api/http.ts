type UnauthorizedListener = () => void

let unauthorizedListener: UnauthorizedListener | null = null

/** Called whenever the session has ended (401), so the app can show the login page. */
export function onUnauthorized(listener: UnauthorizedListener | null): void {
  unauthorizedListener = listener
}

export class ApiError extends Error {
  readonly status: number

  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

/**
 * fetch() for the NoteBloom API: sends the session cookie and, on state-changing requests,
 * echoes the XSRF-TOKEN cookie back in the X-XSRF-TOKEN header as Spring Security expects.
 */
export function apiFetch(url: string, init: RequestInit = {}): Promise<Response> {
  const method = (init.method ?? 'GET').toUpperCase()
  const headers = new Headers(init.headers)
  if (method !== 'GET' && method !== 'HEAD') {
    const token = readCookie('XSRF-TOKEN')
    if (token) headers.set('X-XSRF-TOKEN', token)
  }
  return fetch(url, { ...init, headers, credentials: 'same-origin' })
}

export async function handle<T>(response: Response): Promise<T> {
  if (!response.ok) {
    if (response.status === 401) unauthorizedListener?.()
    const body = await response.json().catch(() => ({ message: response.statusText }))
    throw new ApiError(response.status, body.message ?? `Request failed: ${response.status}`)
  }
  if (response.status === 204) {
    return undefined as T
  }
  return response.json() as Promise<T>
}

export function getJson<T>(url: string): Promise<T> {
  return apiFetch(url).then((res) => handle<T>(res))
}

export function sendJson<T>(url: string, method: 'POST' | 'PUT', body: unknown): Promise<T> {
  return apiFetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  }).then((res) => handle<T>(res))
}

export function sendDelete(url: string): Promise<void> {
  return apiFetch(url, { method: 'DELETE' }).then((res) => handle<void>(res))
}

function readCookie(name: string): string | null {
  const match = document.cookie.split('; ').find((part) => part.startsWith(`${name}=`))
  return match ? decodeURIComponent(match.slice(name.length + 1)) : null
}
