import type { User } from '../types/user'
import { apiFetch, ApiError, handle, sendJson } from './http'

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

export function changePassword(currentPassword: string, newPassword: string): Promise<void> {
  return sendJson(`${BASE_URL}/password`, 'PUT', { currentPassword, newPassword })
}
