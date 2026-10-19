import { useEffect, useRef, useState } from 'react'
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

/** Bottom of the sidebar: who is logged in; clicking it opens a menu above with password, LINE, accounts and logout. */
export function AccountMenu({ user, onLogout, onUserChange }: AccountMenuProps) {
  const [open, setOpen] = useState<OpenDialog>(null)
  const [lineLoginEnabled, setLineLoginEnabled] = useState(false)
  const [lineBusy, setLineBusy] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)
  const notify = useNotify()
  const isAdmin = user.role === 'ADMIN'

  useEffect(() => {
    fetchAuthOptions()
      .then((options) => setLineLoginEnabled(options.lineLoginEnabled))
      .catch(() => setLineLoginEnabled(false))
  }, [])

  // Close on a click outside the menu or on Escape
  useEffect(() => {
    if (!menuOpen) return
    function handlePointer(event: PointerEvent) {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false)
    }
    function handleKey(event: KeyboardEvent) {
      if (event.key === 'Escape') setMenuOpen(false)
    }
    document.addEventListener('pointerdown', handlePointer)
    document.addEventListener('keydown', handleKey)
    return () => {
      document.removeEventListener('pointerdown', handlePointer)
      document.removeEventListener('keydown', handleKey)
    }
  }, [menuOpen])

  /** Menu items close the menu before doing their thing */
  const choose = (action: () => void) => () => {
    setMenuOpen(false)
    action()
  }

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
    <div className="account-menu" ref={menuRef}>
      {menuOpen && (
        <div className="account-popover" role="menu" aria-label="帳號">
          <button type="button" role="menuitem" onClick={choose(() => setOpen('password'))}>
            修改密碼
          </button>
          {lineLoginEnabled && (
            <button
              type="button"
              role="menuitem"
              disabled={lineBusy}
              onClick={choose(user.lineLinked ? confirmUnlinkLine : linkLine)}
            >
              {user.lineLinked ? '解除 LINE 綁定' : '綁定 LINE'}
            </button>
          )}
          {isAdmin && (
            <button type="button" role="menuitem" onClick={choose(() => setOpen('users'))}>
              帳號管理
            </button>
          )}
          <div className="account-popover-divider" role="separator" />
          <button type="button" role="menuitem" className="account-popover-logout" onClick={choose(onLogout)}>
            登出
          </button>
        </div>
      )}
      <button
        type="button"
        className={menuOpen ? 'account-info open' : 'account-info'}
        aria-haspopup="menu"
        aria-expanded={menuOpen}
        title="帳號選單"
        onClick={() => setMenuOpen((open) => !open)}
      >
        <span className="account-avatar" aria-hidden="true">
          {user.displayName.trim().charAt(0).toUpperCase() || '?'}
        </span>
        <span className="account-text">
          <span className="account-name" title={user.displayName}>
            {user.displayName}
          </span>
          <span className="account-meta">
            @{user.username}
            {isAdmin ? ' · 管理者' : ''}
            {user.lineLinked ? ' · 已綁定 LINE' : ''}
          </span>
        </span>
        <span className="account-chevron" aria-hidden="true">
          ▴
        </span>
      </button>

      {open === 'password' && <ChangePasswordDialog onClose={() => setOpen(null)} />}
      {open === 'users' && <UserAdminDialog currentUserId={user.id} onClose={() => setOpen(null)} />}
    </div>
  )
}
