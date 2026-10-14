import exportStyle from './themes/notebloom.css?raw'

export type ExportThemeId = 'dark' | 'light'

export interface ExportTheme {
  id: ExportThemeId
  label: string
}

/** 兩種主題共用同一份 CSS，差別只在 <html data-theme> */
export const EXPORT_STYLE = exportStyle

export const EXPORT_THEMES: Record<ExportThemeId, ExportTheme> = {
  dark: { id: 'dark', label: 'Dark' },
  light: { id: 'light', label: 'Light' },
}

export const DEFAULT_EXPORT_THEME: ExportThemeId = 'dark'

export function isExportThemeId(value: unknown): value is ExportThemeId {
  return value === 'dark' || value === 'light'
}
