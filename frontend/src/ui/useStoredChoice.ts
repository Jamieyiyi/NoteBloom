import { useState } from 'react'

/**
 * 存在 localStorage 的偏好設定（例如檢視模式、匯出樣式）。
 * 讀寫失敗（例如無痕視窗）就退回預設值，不影響使用。
 */
export function useStoredChoice<T extends string>(
  storageKey: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const [value, setValue] = useState<T>(() => {
    try {
      const saved = localStorage.getItem(storageKey)
      return allowed.includes(saved as T) ? (saved as T) : fallback
    } catch {
      return fallback
    }
  })

  function update(next: T) {
    setValue(next)
    try {
      localStorage.setItem(storageKey, next)
    } catch {
      // 只是偏好設定，存不了就算了
    }
  }

  return [value, update]
}
