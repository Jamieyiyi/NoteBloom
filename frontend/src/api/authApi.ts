import type { User } from '../types/user'
import { apiFetch, ApiError, getJson, handle, sendJson } from './http'

const BASE_URL = '/api/auth'

/** The logged-in account, or null when there is no session. */
export async function fetchCurrentUser(): Promise<User | null> {
  const res = await apiFetch(`${BASE_URL}/me`)
  if (res.status === 401) return null
  return handle<User>(res)
}

export async function login(username: string, password: string): Promise<User> {
  // The CSRF cookie is issued on the first API response; make sure it exists before posting
  if (!document.cookie.includes('XSRF-TOKEN=')) await apiFetch(`${BASE_URL}/me`)
  return sendJson(`${BASE_URL}/login`, 'POST', { username, password })
}

export async function logout(): Promise<void> {
  const res = await apiFetch(`${BASE_URL}/logout`, { method: 'POST' })
  if (!res.ok && res.status !== 401) throw new ApiError(res.status, '登出失敗')
}

export interface AuthOptions {
  lineLoginEnabled: boolean
}

/** Login methods this server offers; works without a session. */
export async function fetchAuthOptions(): Promise<AuthOptions> {
  return getJson(`${BASE_URL}/options`)
}

/** Full-page navigation to LINE; LINE sends the browser back to /?line=<result>. */
export function startLineLogin(): void {
  window.location.assign(`${BASE_URL}/line/login`)
}

/** Binds LINE to the logged-in account: the server prepares the request, then the browser goes to LINE. */
export async function startLineLink(): Promise<void> {
  const { authorizeUrl } = await sendJson<{ authorizeUrl: string }>(`${BASE_URL}/line/link`, 'POST', {})
  window.location.assign(authorizeUrl)
}

export function unlinkLine(): Promise<User> {
  return apiFetch(`${BASE_URL}/line`, { method: 'DELETE' }).then((res) => handle<User>(res))
}

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return sendJson(`${BASE_URL}/password`, 'PUT', { currentPassword, newPassword })
}
