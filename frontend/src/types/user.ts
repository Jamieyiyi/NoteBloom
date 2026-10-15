export type UserRole = 'ADMIN' | 'USER'

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
  enabled: boolean
  createdAt: string
}
