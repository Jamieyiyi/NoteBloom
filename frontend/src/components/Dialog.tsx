import { useEffect, useRef, type ReactNode } from 'react'

interface DialogProps {
  title: string
  onClose: () => void
  wide?: boolean
  children: ReactNode
}

/** Modal built on the native <dialog>, which handles focus trapping and Esc for free. Mount it to open it. */
export function Dialog({ title, onClose, wide = false, children }: DialogProps) {
  const ref = useRef<HTMLDialogElement>(null)

  useEffect(() => {
    const dialog = ref.current
    if (!dialog || dialog.open) return
    dialog.showModal()
    // showModal() focuses the first focusable element (the close button); start in the first field instead,
    // or on an element marked data-autofocus (e.g. the safe choice of a confirmation)
    dialog.querySelector<HTMLElement>('[data-autofocus], input, select, textarea')?.focus()
  }, [])

  return (
    <dialog
      ref={ref}
      className={wide ? 'app-dialog wide' : 'app-dialog'}
      // Esc fires "cancel" synchronously; let the parent unmount the dialog instead of waiting for the async "close"
      onCancel={(event) => {
        event.preventDefault()
        onClose()
      }}
    >
      <div className="app-dialog-header">
        <h2>{title}</h2>
        <button type="button" className="app-dialog-close" aria-label="關閉" onClick={onClose}>
          ×
        </button>
      </div>
      {children}
    </dialog>
  )
}
