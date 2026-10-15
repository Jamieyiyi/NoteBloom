import { useState } from 'react'
import type { User } from '../types/user'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { UserAdminDialog } from './UserAdminDialog'

interface AccountMenuProps {
  user: User
  onLogout: () => void
}

type OpenDialog = 'password' | 'users' | null

/** Bottom of the sidebar: who is logged in, plus password, account management and logout. */
export function AccountMenu({ user, onLogout }: AccountMenuProps) {
  const [open, setOpen] = useState<OpenDialog>(null)
  const isAdmin = user.role === 'ADMIN'

  return (
    <div className="account-menu">
      <div className="account-info">
        <span className="account-avatar" aria-hidden="true">
          {user.displayName.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <div className="account-text">
          <div className="account-name" title={user.displayName}>
            {user.displayName}
          </div>
          <div className="account-meta">
            @{user.username}
            {isAdmin ? ' · 管理者' : ''}
          </div>
        </div>
      </div>
      <div className="account-actions">
        <button type="button" onClick={() => setOpen('password')}>
          修改密碼
        </button>
        {isAdmin && (
          <button type="button" onClick={() => setOpen('users')}>
            帳號管理
          </button>
        )}
        <button type="button" onClick={onLogout}>
          登出
        </button>
      </div>

      {open === 'password' && <ChangePasswordDialog onClose={() => setOpen(null)} />}
      {open === 'users' && <UserAdminDialog currentUserId={user.id} onClose={() => setOpen(null)} />}
    </div>
  )
}
