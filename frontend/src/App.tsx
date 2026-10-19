import { useEffect, useRef, useState } from 'react'
import { fetchCurrentUser, logout } from './api/authApi'
import { onUnauthorized } from './api/http'
import type { User } from './types/user'
import { LoginPage } from './components/LoginPage'
import { Notebook } from './components/Notebook'
import { reportError, useNotify, type Notifier } from './ui/notifications'
import { useAppTheme } from './ui/useAppTheme'
import { useIdleLogout } from './ui/useIdleLogout'
import './styles/app.css'

export default function App() {
  const [theme, toggleTheme] = useAppTheme()
  // undefined while the session is being checked, null when logged out
  const [user, setUser] = useState<User | null | undefined>(undefined)
  const notify = useNotify()

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  // Coming back from LINE: the server redirects to /?line=<result>; show it once and tidy the address bar
  const lineResultShown = useRef(false)
  useEffect(() => {
    if (lineResultShown.current) return
    lineResultShown.current = true
    const params = new URLSearchParams(window.location.search)
    const result = params.get('line')
    if (!result) return
    showLineResult(notify, result)
    params.delete('line')
    const query = params.toString()
    window.history.replaceState(null, '', `${window.location.pathname}${query ? `?${query}` : ''}${window.location.hash}`)
  }, [notify])

  // Several requests can fail with 401 at once; warn only for the first one
  const loggedIn = useRef(false)
  useEffect(() => {
    loggedIn.current = Boolean(user)
  }, [user])

  // Any API call answered with 401 means the session expired or was ended by an administrator
  useEffect(() => {
    onUnauthorized(() => {
      if (loggedIn.current) {
        loggedIn.current = false
        notify.warning('登入狀態已失效，請重新登入')
      }
      setUser(null)
    })
    return () => onUnauthorized(null)
  }, [notify])

  async function handleLogout(reason?: 'idle') {
    try {
      await logout()
      notify.info(reason === 'idle' ? '閒置超過 30 分鐘，已自動登出' : '已登出')
    } catch (err) {
      reportError(notify, err, '登出失敗')
    } finally {
      setUser(null)
    }
  }

  useIdleLogout(Boolean(user), () => void handleLogout('idle'))

  if (user === undefined) return <p className="app-hint">載入中…</p>
  if (user === null) return <LoginPage theme={theme} onToggleTheme={toggleTheme} onLoggedIn={setUser} />

  // Keyed by account so nothing from a previous user's workspace survives a re-login
  return (
    <Notebook
      key={user.id}
      user={user}
      theme={theme}
      onToggleTheme={toggleTheme}
      onLogout={() => void handleLogout()}
      onUserChange={setUser}
    />
  )
}

function showLineResult(notify: Notifier, result: string) {
  switch (result) {
    case 'logged-in':
      return notify.success('已用 LINE 登入')
    case 'linked':
      return notify.success('已綁定 LINE，之後可以用 LINE 登入')
    case 'not-linked':
      return notify.warning('這個 LINE 還沒有綁定 NoteBloom 帳號。請先用帳號密碼登入，再到左下角「綁定 LINE」')
    case 'taken':
      return notify.error('這個 LINE 已經綁定其他 NoteBloom 帳號')
    case 'cancelled':
      return notify.info('已取消 LINE 登入')
    case 'expired':
      return notify.warning('LINE 登入已逾時，請再試一次')
    case 'disabled':
      return notify.warning('LINE 登入尚未啟用')
    default:
      return notify.error('LINE 登入失敗，請稍後再試')
  }
}
