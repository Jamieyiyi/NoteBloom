import { useEffect, useState, type FormEvent } from 'react'
import { createUser, listUsers, resetPassword, updateUser, type UserUpdateInput } from '../api/usersApi'
import type { User, UserRole } from '../types/user'
import { MIN_PASSWORD_LENGTH } from './ChangePasswordDialog'
import { Dialog } from './Dialog'

const ROLE_LABELS: Record<UserRole, string> = { ADMIN: '管理者', USER: '一般使用者' }

interface UserAdminDialogProps {
  currentUserId: string
  onClose: () => void
}

/** Invitation-only sign-up: administrators create accounts here and hand out the initial password. */
export function UserAdminDialog({ currentUserId, onClose }: UserAdminDialogProps) {
  const [users, setUsers] = useState<User[]>([])
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    listUsers()
      .then(setUsers)
      .catch((err) => setError(err instanceof Error ? err.message : '載入失敗'))
  }, [])

  async function save(user: User, patch: Partial<UserUpdateInput>) {
    setError(null)
    try {
      const updated = await updateUser(user.id, {
        displayName: user.displayName,
        role: user.role,
        enabled: user.enabled,
        ...patch,
      })
      setUsers((prev) => prev.map((item) => (item.id === updated.id ? updated : item)))
    } catch (err) {
      setError(err instanceof Error ? err.message : '儲存失敗')
    }
  }

  return (
    <Dialog title="帳號管理" wide onClose={onClose}>
      <div className="dialog-body">
        <NewUserForm onCreated={(user) => setUsers((prev) => [...prev, user])} />

        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}

        <div className="user-table-wrap">
          <table className="user-table">
            <thead>
              <tr>
                <th>帳號</th>
                <th>顯示名稱</th>
                <th>角色</th>
                <th>狀態</th>
                <th>密碼</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <UserRow
                  key={user.id}
                  user={user}
                  isSelf={user.id === currentUserId}
                  onSave={(patch) => save(user, patch)}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </Dialog>
  )
}

interface UserRowProps {
  user: User
  isSelf: boolean
  onSave: (patch: Partial<UserUpdateInput>) => Promise<void>
}

function UserRow({ user, isSelf, onSave }: UserRowProps) {
  const [displayName, setDisplayName] = useState(user.displayName)
  const [resetting, setResetting] = useState(false)

  return (
    <tr className={user.enabled ? undefined : 'disabled'}>
      <td className="user-username">
        @{user.username}
        {isSelf && <span className="user-self">（你）</span>}
      </td>
      <td>
        <input
          className="user-inline-input"
          value={displayName}
          maxLength={100}
          aria-label={`${user.username} 的顯示名稱`}
          onChange={(e) => setDisplayName(e.target.value)}
          onBlur={() => {
            const trimmed = displayName.trim()
            if (!trimmed) setDisplayName(user.displayName)
            else if (trimmed !== user.displayName) onSave({ displayName: trimmed })
          }}
        />
      </td>
      <td>
        <select
          value={user.role}
          disabled={isSelf}
          title={isSelf ? '不能變更自己的角色' : undefined}
          aria-label={`${user.username} 的角色`}
          onChange={(e) => onSave({ role: e.target.value as UserRole })}
        >
          {(Object.keys(ROLE_LABELS) as UserRole[]).map((role) => (
            <option key={role} value={role}>
              {ROLE_LABELS[role]}
            </option>
          ))}
        </select>
      </td>
      <td>
        <label className="user-enabled" title={isSelf ? '不能停用自己的帳號' : undefined}>
          <input
            type="checkbox"
            checked={user.enabled}
            disabled={isSelf}
            onChange={(e) => onSave({ enabled: e.target.checked })}
          />
          {user.enabled ? '啟用' : '已停用'}
        </label>
      </td>
      <td>
        {resetting ? (
          <ResetPasswordForm userId={user.id} onDone={() => setResetting(false)} />
        ) : (
          <button type="button" className="link-button" onClick={() => setResetting(true)}>
            重設密碼
          </button>
        )}
      </td>
    </tr>
  )
}

function ResetPasswordForm({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [password, setPassword] = useState(generatePassword)
  const [message, setMessage] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  async function submit() {
    if (password.length < MIN_PASSWORD_LENGTH) {
      setMessage(`至少 ${MIN_PASSWORD_LENGTH} 個字元`)
      return
    }
    try {
      await resetPassword(userId, password)
      setSaved(true)
      setMessage('已重設，請把新密碼交給對方（對方已被登出）')
    } catch (err) {
      setMessage(err instanceof Error ? err.message : '重設失敗')
    }
  }

  return (
    <div className="user-reset">
      <div className="user-reset-row">
        <input
          className="user-inline-input mono"
          value={password}
          readOnly={saved}
          maxLength={72}
          aria-label="新密碼"
          onChange={(e) => setPassword(e.target.value)}
        />
        {saved ? (
          <button type="button" className="link-button" onClick={onDone}>
            完成
          </button>
        ) : (
          <>
            <button type="button" className="link-button" onClick={submit}>
              確定
            </button>
            <button type="button" className="link-button muted" onClick={onDone}>
              取消
            </button>
          </>
        )}
      </div>
      {message && <div className={saved ? 'user-reset-note' : 'user-reset-note error'}>{message}</div>}
    </div>
  )
}

function NewUserForm({ onCreated }: { onCreated: (user: User) => void }) {
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState(generatePassword)
  const [role, setRole] = useState<UserRole>('USER')
  const [message, setMessage] = useState<{ text: string; ok: boolean } | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setMessage(null)
    try {
      const created = await createUser({ username: username.trim(), displayName: displayName.trim(), password, role })
      onCreated(created)
      setMessage({ text: `已建立 @${created.username}，初始密碼：${password}（請轉交對方，登入後可自行修改）`, ok: true })
      setUsername('')
      setDisplayName('')
      setPassword(generatePassword())
      setRole('USER')
    } catch (err) {
      setMessage({ text: err instanceof Error ? err.message : '建立失敗', ok: false })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="new-user-form" onSubmit={handleSubmit}>
      <div className="new-user-title">新增帳號</div>
      <div className="new-user-grid">
        <label className="form-field">
          <span>帳號（登入用）</span>
          <input
            value={username}
            required
            minLength={3}
            maxLength={50}
            pattern="[A-Za-z0-9._\-]+"
            title="3–50 個英數字、點、底線或連字號"
            autoComplete="off"
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>顯示名稱</span>
          <input value={displayName} required maxLength={100} onChange={(e) => setDisplayName(e.target.value)} />
        </label>
        <label className="form-field">
          <span>初始密碼</span>
          <div className="input-with-button">
            <input
              className="mono"
              value={password}
              required
              minLength={MIN_PASSWORD_LENGTH}
              maxLength={72}
              autoComplete="off"
              onChange={(e) => setPassword(e.target.value)}
            />
            <button type="button" className="link-button" onClick={() => setPassword(generatePassword())}>
              重新產生
            </button>
          </div>
        </label>
        <label className="form-field">
          <span>角色</span>
          <select value={role} onChange={(e) => setRole(e.target.value as UserRole)}>
            {(Object.keys(ROLE_LABELS) as UserRole[]).map((value) => (
              <option key={value} value={value}>
                {ROLE_LABELS[value]}
              </option>
            ))}
          </select>
        </label>
      </div>
      <div className="new-user-footer">
        {message && <span className={message.ok ? 'form-success' : 'form-error'}>{message.text}</span>}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? '建立中…' : '建立帳號'}
        </button>
      </div>
    </form>
  )
}

// No look-alike characters (0/O, 1/l/I) so the password can be read out or copied by hand
const PASSWORD_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789'

function generatePassword(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(12))
  return Array.from(bytes, (byte) => PASSWORD_ALPHABET[byte % PASSWORD_ALPHABET.length]).join('')
}
