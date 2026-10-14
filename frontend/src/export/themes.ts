import exportStyle from './themes/notebloom.css?raw'
import bloomStyle from '../ui/bloom.css?raw'

export type ExportThemeId = 'dark' | 'light'

/** 匯出 HTML 用的 CSS：兩種明暗模式共用，差別只在 <html data-theme>；開花切換鈕的樣式和編輯介面共用 */
export const EXPORT_STYLE = `${exportStyle}\n${bloomStyle}`
