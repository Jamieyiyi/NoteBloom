import { useEffect, useRef } from 'react'
import { apiFetch } from '../api/http'

/** Same as server.servlet.session.timeout in application.yml */
export const IDLE_LIMIT_MS = 30 * 60 * 1000
/** While the reader is active, touch the session at most this often so the server does not expire it */
const KEEP_ALIVE_MS = 5 * 60 * 1000
const CHECK_EVERY_MS = 30 * 1000
const ACTIVITY_EVENTS = ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart', 'scroll'] as const

/**
 * Logs out after IDLE_LIMIT_MS without mouse, keyboard or scrolling. Reading a note makes no requests,
 * so activity also refreshes the server session now and then; otherwise it would expire while in use.
 * Timestamps rather than one long timer, so a computer waking from sleep is handled on the next check.
 */
export function useIdleLogout(enabled: boolean, onIdle: () => void): void {
  const onIdleRef = useRef(onIdle)
  useEffect(() => {
    onIdleRef.current = onIdle
  }, [onIdle])

  useEffect(() => {
    if (!enabled) return
    let lastActivity = Date.now()
    let lastKeepAlive = Date.now()
    // Logging out takes a request; checks that run meanwhile must not log out (and announce it) again
    let loggedOut = false

    function handleActivity() {
      const now = Date.now()
      lastActivity = now
      if (now - lastKeepAlive >= KEEP_ALIVE_MS) {
        lastKeepAlive = now
        void apiFetch('/api/auth/me').catch(() => undefined)
      }
    }

    function check() {
      if (loggedOut || Date.now() - lastActivity < IDLE_LIMIT_MS) return
      loggedOut = true
      onIdleRef.current()
    }

    ACTIVITY_EVENTS.forEach((type) => window.addEventListener(type, handleActivity, { passive: true, capture: true }))
    document.addEventListener('visibilitychange', check)
    const timer = window.setInterval(check, CHECK_EVERY_MS)
    return () => {
      ACTIVITY_EVENTS.forEach((type) => window.removeEventListener(type, handleActivity, { capture: true }))
      document.removeEventListener('visibilitychange', check)
      window.clearInterval(timer)
    }
  }, [enabled])
}
