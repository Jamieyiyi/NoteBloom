import { useEffect, useRef, useState } from 'react'
import { fetchCurrentUser, logout } from './api/authApi'
import { onUnauthorized } from './api/http'
import type { User } from './types/user'
import { LoginPage } from './components/LoginPage'
import { Notebook } from './components/Notebook'
import { reportError, useNotify } from './ui/notifications'
import { useAppTheme } from './ui/useAppTheme'
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

  async function handleLogout() {
    try {
      await logout()
      notify.info('已登出')
    } catch (err) {
      reportError(notify, err, '登出失敗')
    } finally {
      setUser(null)
    }
  }

  if (user === undefined) return <p className="app-hint">載入中…</p>
  if (user === null) return <LoginPage theme={theme} onToggleTheme={toggleTheme} onLoggedIn={setUser} />

  // Keyed by account so nothing from a previous user's workspace survives a re-login
  return <Notebook key={user.id} user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
}
