import { useCallback, useMemo, useRef, useState, type ReactNode } from 'react'
import { NotificationContext, type ConfirmOptions, type MessageTone, type Notifier } from '../ui/notifications'
import { Dialog } from './Dialog'
import { MessageFlower } from './GardenIcons'

interface Toast {
  id: number
  tone: MessageTone
  text: string
}

interface PendingConfirm {
  options: ConfirmOptions
  resolve: (confirmed: boolean) => void
}

// Errors and warnings stay longer so there is time to read them
const TOAST_DURATION_MS: Record<MessageTone, number> = { info: 3500, success: 3500, warning: 6000, error: 7000 }
const MAX_TOASTS = 4

export function NotificationProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const [pending, setPending] = useState<PendingConfirm | null>(null)
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id))
  }, [])

  const notifier = useMemo<Notifier>(() => {
    const push = (tone: MessageTone) => (text: string) => {
      const id = ++nextId.current
      setToasts((prev) => [...prev.slice(-(MAX_TOASTS - 1)), { id, tone, text }])
      window.setTimeout(() => dismiss(id), TOAST_DURATION_MS[tone])
    }
    return {
      info: push('info'),
      success: push('success'),
      warning: push('warning'),
      error: push('error'),
      confirm: (options) =>
        new Promise<boolean>((resolve) => {
          setPending((previous) => {
            // Only one confirmation at a time; an unanswered one counts as cancelled
            previous?.resolve(false)
            return { options, resolve }
          })
        }),
    }
  }, [dismiss])

  function settle(confirmed: boolean) {
    pending?.resolve(confirmed)
    setPending(null)
  }

  return (
    <NotificationContext.Provider value={notifier}>
      {children}

      <div className="toast-stack">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`toast toast-${toast.tone}`}
            role={toast.tone === 'error' || toast.tone === 'warning' ? 'alert' : 'status'}
          >
            <MessageFlower tone={toast.tone} size={20} />
            <span className="toast-text">{toast.text}</span>
            <button type="button" className="toast-close" aria-label="關閉訊息" onClick={() => dismiss(toast.id)}>
              ×
            </button>
          </div>
        ))}
      </div>

      {pending && <ConfirmDialog options={pending.options} onSettle={settle} />}
    </NotificationContext.Provider>
  )
}

function ConfirmDialog({ options, onSettle }: { options: ConfirmOptions; onSettle: (confirmed: boolean) => void }) {
  const tone = options.tone ?? 'info'
  const destructive = tone === 'warning' || tone === 'error'

  return (
    <Dialog title={options.title} onClose={() => onSettle(false)}>
      <div className="dialog-body">
        <div className="confirm-message">
          <MessageFlower tone={tone} size={28} />
          <p>{options.message}</p>
        </div>
        <div className="dialog-actions">
          {/* Focus starts on the safe choice so a stray Enter does not confirm */}
          <button type="button" className="secondary-button" data-autofocus onClick={() => onSettle(false)}>
            取消
          </button>
          <button
            type="button"
            className={destructive ? 'danger-button' : 'primary-button'}
            onClick={() => onSettle(true)}
          >
            {options.confirmLabel ?? '確定'}
          </button>
        </div>
      </div>
    </Dialog>
  )
}
