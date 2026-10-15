import { createContext, useContext } from 'react'
import { ApiError } from '../api/http'
import type { MessageTone } from '../components/GardenIcons'

export type { MessageTone }

export interface ConfirmOptions {
  title: string
  message: string
  /** Text of the confirming button, e.g. 刪除 */
  confirmLabel?: string
  /** warning / error make the confirming button red, for destructive actions */
  tone?: MessageTone
}

/**
 * In-app replacement for window.alert / window.confirm: short flower toasts in the corner
 * and a confirmation dialog that resolves to true / false.
 */
export interface Notifier {
  info: (text: string) => void
  success: (text: string) => void
  warning: (text: string) => void
  error: (text: string) => void
  confirm: (options: ConfirmOptions) => Promise<boolean>
}

export const NotificationContext = createContext<Notifier | null>(null)

export function useNotify(): Notifier {
  const notifier = useContext(NotificationContext)
  if (!notifier) throw new Error('useNotify must be used inside <NotificationProvider>')
  return notifier
}

/**
 * Message of a failed request for display. Server texts for rejected input (e.g. 帳號或密碼錯誤) are shown as is;
 * "not found", server errors and network failures carry technical details, so the friendly fallback is used.
 */
export function errorMessage(err: unknown, fallback: string): string {
  if (err instanceof ApiError) {
    return err.status === 404 || err.status >= 500 || !err.message ? fallback : err.message
  }
  return fallback
}

/** Shows a failed request as an error toast; 401 is skipped because the session-expired notice already covers it. */
export function reportError(notifier: Notifier, err: unknown, fallback: string): void {
  if (err instanceof ApiError && err.status === 401) return
  notifier.error(errorMessage(err, fallback))
}
