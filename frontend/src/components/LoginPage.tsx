import { useState, type FormEvent } from 'react'
import { login } from '../api/authApi'
import type { User } from '../types/user'
import type { AppTheme } from '../ui/useAppTheme'
import logoOnDark from '../assets/logo-on-dark.png'
import logoOnLight from '../assets/logo-on-light.png'
import { BloomToggle } from './BloomToggle'

interface LoginPageProps {
  theme: AppTheme
  onToggleTheme: () => void
  onLoggedIn: (user: User) => void
}

export function LoginPage({ theme, onToggleTheme, onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      onLoggedIn(await login(username.trim(), password))
    } catch (err) {
      setError(err instanceof Error ? err.message : '登入失敗')
      setPassword('')
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="login-page">
      <div className="app-theme-toggle">
        <BloomToggle theme={theme} onToggle={onToggleTheme} />
      </div>
      <form className="login-card" onSubmit={handleSubmit}>
        <img className="login-logo" src={theme === 'dark' ? logoOnDark : logoOnLight} alt="NoteBloom" />
        <label className="form-field">
          <span>帳號</span>
          <input
            value={username}
            autoComplete="username"
            autoFocus
            required
            maxLength={50}
            onChange={(e) => setUsername(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>密碼</span>
          <input
            type="password"
            value={password}
            autoComplete="current-password"
            required
            maxLength={72}
            onChange={(e) => setPassword(e.target.value)}
          />
        </label>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? '登入中…' : '登入'}
        </button>
        <p className="login-hint">帳號由管理者建立，忘記密碼請聯絡管理者重設。</p>
      </form>
    </div>
  )
}
