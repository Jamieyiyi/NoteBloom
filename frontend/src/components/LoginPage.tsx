import { useEffect, useState, type FormEvent } from 'react'
import { fetchAuthOptions, login, startLineLogin } from '../api/authApi'
import { ApiError } from '../api/http'
import type { User } from '../types/user'
import type { AppTheme } from '../ui/useAppTheme'
import { errorMessage } from '../ui/notifications'
import logoOnDark from '../assets/logo-on-dark.png'
import logoOnLight from '../assets/logo-on-light.png'
import { BloomToggle } from './BloomToggle'
import { Notice } from './Notice'
import type { MessageTone } from './GardenIcons'

interface LoginPageProps {
  theme: AppTheme
  onToggleTheme: () => void
  onLoggedIn: (user: User) => void
}

export function LoginPage({ theme, onToggleTheme, onLoggedIn }: LoginPageProps) {
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<{ text: string; tone: MessageTone } | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [lineLoginEnabled, setLineLoginEnabled] = useState(false)

  useEffect(() => {
    fetchAuthOptions()
      .then((options) => setLineLoginEnabled(options.lineLoginEnabled))
      // Without the options the password form still works; just leave the LINE button out
      .catch(() => setLineLoginEnabled(false))
  }, [])

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    try {
      onLoggedIn(await login(username.trim(), password))
    } catch (err) {
      // 429 means temporarily locked after too many failures: a warning, not a wrong password
      const tone = err instanceof ApiError && err.status === 429 ? 'warning' : 'error'
      setError({ text: errorMessage(err, '無法連線到伺服器，請稍後再試'), tone })
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
        {error && <Notice tone={error.tone}>{error.text}</Notice>}
        <button type="submit" className="primary-button" disabled={submitting}>
          {submitting ? '登入中…' : '登入'}
        </button>
        {lineLoginEnabled && (
          <>
            <div className="login-divider">或</div>
            <button type="button" className="line-login-button" onClick={startLineLogin}>
              使用 LINE 登入
            </button>
          </>
        )}
        <p className="login-hint">
          帳號由管理者建立，忘記密碼請聯絡管理者重設。
          {lineLoginEnabled && <br />}
          {lineLoginEnabled && '要用 LINE 登入，請先用帳號密碼登入後在左下角「綁定 LINE」。'}
        </p>
      </form>
    </div>
  )
}
