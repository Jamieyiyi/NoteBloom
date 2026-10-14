// Material Symbols 圖示路徑，viewBox 為 0 -960 960 960
export const ICON_VIEW_BOX = '0 -960 960 960'

export const COPY_ICON_PATH =
  'M360-240q-33 0-56.5-23.5T280-320v-480q0-33 23.5-56.5T360-880h360q33 0 56.5 23.5T800-800v480q0 33-23.5 56.5T720-240H360Zm0-80h360v-480H360v480ZM200-80q-33 0-56.5-23.5T120-160v-560h80v560h440v80H200Zm160-240v-480 480Z'

export const CHECK_ICON_PATH = 'M382-240 154-468l57-57 171 171 367-367 57 57-424 424Z'

/** 給匯出的獨立 HTML 用的 SVG 字串 */
export function svgIcon(path: string, className: string): string {
  return `<svg class="${className}" xmlns="http://www.w3.org/2000/svg" viewBox="${ICON_VIEW_BOX}" fill="currentColor" aria-hidden="true"><path d="${path}"/></svg>`
}
