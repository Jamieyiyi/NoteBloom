import type { User, UserRole } from '../types/user'
import { getJson, sendJson } from './http'

const BASE_URL = '/api/admin/users'

export interface NewUserInput {
  username: string
  displayName: string
  password: string
  role: UserRole
}

export interface UserUpdateInput {
  displayName: string
  role: UserRole
  enabled: boolean
}

export function listUsers(): Promise<User[]> {
  return getJson(BASE_URL)
}

export function createUser(input: NewUserInput): Promise<User> {
  return sendJson(BASE_URL, 'POST', input)
}

export function updateUser(id: string, input: UserUpdateInput): Promise<User> {
  return sendJson(`${BASE_URL}/${id}`, 'PUT', input)
}

export function resetPassword(id: string, newPassword: string): Promise<void> {
  return sendJson(`${BASE_URL}/${id}/password`, 'PUT', { newPassword })
}
