import { useState } from 'react'
import { DEFAULT_EXPORT_THEME, isExportThemeId, type ExportThemeId } from './themes'

const STORAGE_KEY = 'notebloom-export-theme'

/** 記住上次選的匯出樣式；讀寫失敗（例如無痕視窗）就退回預設值。 */
export function useExportTheme(): [ExportThemeId, (theme: ExportThemeId) => void] {
  const [theme, setTheme] = useState<ExportThemeId>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY)
      return isExportThemeId(saved) ? saved : DEFAULT_EXPORT_THEME
    } catch {
      return DEFAULT_EXPORT_THEME
    }
  })

  function updateTheme(next: ExportThemeId) {
    setTheme(next)
    try {
      localStorage.setItem(STORAGE_KEY, next)
    } catch {
      // 只是偏好設定，存不了就算了
    }
  }

  return [theme, updateTheme]
}
