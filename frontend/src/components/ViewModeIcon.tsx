import type { ReactNode } from 'react'

export type ViewMode = 'edit' | 'split' | 'preview'

// 線條風格的小圖示：鉛筆（編輯）、左右分欄（分割）、眼睛（預覽）
const PATHS: Record<ViewMode, ReactNode> = {
  edit: (
    <>
      <path d="M4 20h4L19.5 8.5a2.1 2.1 0 0 0-3-3L5 17v3Z" />
      <path d="m14.5 7.5 3 3" />
    </>
  ),
  split: (
    <>
      <rect x="3" y="4.5" width="18" height="15" rx="2.5" />
      <path d="M12 4.5v15" />
    </>
  ),
  preview: (
    <>
      <path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12Z" />
      <circle cx="12" cy="12" r="3" />
    </>
  ),
}

export function ViewModeIcon({ mode }: { mode: ViewMode }) {
  return (
    <svg
      width={18}
      height={18}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {PATHS[mode]}
    </svg>
  )
}
