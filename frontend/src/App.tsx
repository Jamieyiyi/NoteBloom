import { useEffect, useState } from 'react'
import { fetchCurrentUser, logout } from './api/authApi'
import { onUnauthorized } from './api/http'
import type { User } from './types/user'
import { LoginPage } from './components/LoginPage'
import { Notebook } from './components/Notebook'
import { useAppTheme } from './ui/useAppTheme'
import './styles/app.css'

export default function App() {
  const [theme, toggleTheme] = useAppTheme()
  // undefined while the session is being checked, null when logged out
  const [user, setUser] = useState<User | null | undefined>(undefined)

  useEffect(() => {
    fetchCurrentUser()
      .then(setUser)
      .catch(() => setUser(null))
  }, [])

  // Any API call answered with 401 means the session expired or was ended by an administrator
  useEffect(() => {
    onUnauthorized(() => setUser(null))
    return () => onUnauthorized(null)
  }, [])

  async function handleLogout() {
    try {
      await logout()
    } finally {
      setUser(null)
    }
  }

  if (user === undefined) return <p className="app-hint">載入中…</p>
  if (user === null) return <LoginPage theme={theme} onToggleTheme={toggleTheme} onLoggedIn={setUser} />

  // Keyed by account so nothing from a previous user's workspace survives a re-login
  return <Notebook key={user.id} user={user} theme={theme} onToggleTheme={toggleTheme} onLogout={handleLogout} />
}
