import { useState, type FormEvent } from 'react'
import { changePassword } from '../api/authApi'
import { errorMessage, useNotify } from '../ui/notifications'
import { Dialog } from './Dialog'
import { Notice } from './Notice'

export const MIN_PASSWORD_LENGTH = 8

export function ChangePasswordDialog({ onClose }: { onClose: () => void }) {
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const notify = useNotify()

  async function handleSubmit(event: FormEvent) {
    event.preventDefault()
    if (next.length < MIN_PASSWORD_LENGTH) {
      setError(`新密碼至少要 ${MIN_PASSWORD_LENGTH} 個字元`)
      return
    }
    if (next !== confirm) {
      setError('兩次輸入的新密碼不一樣')
      return
    }
    setSubmitting(true)
    setError(null)
    try {
      await changePassword(current, next)
      notify.success('密碼已更新，下次登入請使用新密碼')
      onClose()
    } catch (err) {
      setError(errorMessage(err, '修改失敗，請稍後再試'))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog title="修改密碼" onClose={onClose}>
      <form className="dialog-body" onSubmit={handleSubmit}>
        <label className="form-field">
          <span>目前的密碼</span>
          <input
            type="password"
            value={current}
            autoComplete="current-password"
            required
            onChange={(e) => setCurrent(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>新密碼（至少 {MIN_PASSWORD_LENGTH} 個字元）</span>
          <input
            type="password"
            value={next}
            autoComplete="new-password"
            required
            maxLength={72}
            onChange={(e) => setNext(e.target.value)}
          />
        </label>
        <label className="form-field">
          <span>再輸入一次新密碼</span>
          <input
            type="password"
            value={confirm}
            autoComplete="new-password"
            required
            maxLength={72}
            onChange={(e) => setConfirm(e.target.value)}
          />
        </label>
        {error && <Notice tone="error">{error}</Notice>}
        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={onClose}>
            取消
          </button>
          <button type="submit" className="primary-button" disabled={submitting}>
            {submitting ? '儲存中…' : '更新密碼'}
          </button>
        </div>
      </form>
    </Dialog>
  )
}
