import { useEffect, useState } from 'react'
import type { User } from '../types/user'
import { fetchAuthOptions, startLineLink, unlinkLine } from '../api/authApi'
import { reportError, useNotify } from '../ui/notifications'
import { ChangePasswordDialog } from './ChangePasswordDialog'
import { UserAdminDialog } from './UserAdminDialog'

interface AccountMenuProps {
  user: User
  onLogout: () => void
  /** Called with the updated account, e.g. after LINE is unbound */
  onUserChange: (user: User) => void
}

type OpenDialog = 'password' | 'users' | null

/** Bottom of the sidebar: who is logged in, plus password, account management and logout. */
export function AccountMenu({ user, onLogout, onUserChange }: AccountMenuProps) {
  const [open, setOpen] = useState<OpenDialog>(null)
  const [lineLoginEnabled, setLineLoginEnabled] = useState(false)
  const [lineBusy, setLineBusy] = useState(false)
  const notify = useNotify()
  const isAdmin = user.role === 'ADMIN'

  useEffect(() => {
    fetchAuthOptions()
      .then((options) => setLineLoginEnabled(options.lineLoginEnabled))
      .catch(() => setLineLoginEnabled(false))
  }, [])

  async function linkLine() {
    setLineBusy(true)
    try {
      // Leaves the page for LINE; the result comes back as /?line=linked
      await startLineLink()
    } catch (err) {
      reportError(notify, err, '無法開始綁定 LINE，請稍後再試')
      setLineBusy(false)
    }
  }

  async function confirmUnlinkLine() {
    const confirmed = await notify.confirm({
      title: '解除 LINE 綁定',
      message: '解除後就不能用這個 LINE 登入，之後可以再重新綁定。',
      confirmLabel: '解除綁定',
      tone: 'warning',
    })
    if (!confirmed) return
    setLineBusy(true)
    try {
      onUserChange(await unlinkLine())
      notify.success('已解除 LINE 綁定')
    } catch (err) {
      reportError(notify, err, '解除 LINE 綁定失敗')
    } finally {
      setLineBusy(false)
    }
  }

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
            {user.lineLinked ? ' · 已綁定 LINE' : ''}
          </div>
        </div>
      </div>
      <div className="account-actions">
        <button type="button" onClick={() => setOpen('password')}>
          修改密碼
        </button>
        {lineLoginEnabled && (
          <button type="button" disabled={lineBusy} onClick={user.lineLinked ? confirmUnlinkLine : linkLine}>
            {user.lineLinked ? '解除 LINE 綁定' : '綁定 LINE'}
          </button>
        )}
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
