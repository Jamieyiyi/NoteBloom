import type { ReactNode } from 'react'
import { MessageFlower, type MessageTone } from './GardenIcons'

/** A message that stays in place inside a form, with the same flower colours as the toasts. */
export function Notice({ tone, children }: { tone: MessageTone; children: ReactNode }) {
  return (
    <p className={`notice notice-${tone}`} role={tone === 'error' || tone === 'warning' ? 'alert' : 'status'}>
      <MessageFlower tone={tone} size={16} />
      <span>{children}</span>
    </p>
  )
}
