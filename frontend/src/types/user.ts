export type UserRole = 'ADMIN' | 'USER'

export interface User {
  id: string
  username: string
  displayName: string
  role: UserRole
  enabled: boolean
  /** A LINE account is bound and can be used to log in */
  lineLinked: boolean
  createdAt: string
}
