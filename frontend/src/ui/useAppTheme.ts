import { useEffect, useState } from 'react'

export type AppTheme = 'light' | 'dark'

// index.html 的 inline script 也用同一個 key，在 React 載入前先套用，避免閃一下白畫面
const STORAGE_KEY = 'notebloom-app-theme'

function initialTheme(): AppTheme {
  const applied = document.documentElement.dataset.theme
  if (applied === 'light' || applied === 'dark') return applied
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

/** 編輯介面本身的明亮 / 暗黑模式（和匯出 HTML 的樣式分開設定）。 */
export function useAppTheme(): [AppTheme, () => void] {
  const [theme, setTheme] = useState<AppTheme>(initialTheme)

  useEffect(() => {
    document.documentElement.dataset.theme = theme
  }, [theme])

  function toggleTheme() {
    const next: AppTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 只是偏好設定，存不了就算了
    }
  }

  return [theme, toggleTheme]
}
