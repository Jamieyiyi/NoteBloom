/**
 * 明暗切換鈕的小花：晚上（暗黑模式）花瓣收成花苞，早上（明亮模式）開花。
 * 開合動畫由 bloom.css 依 <html data-theme> 控制；這裡只產生 SVG 字串，
 * 編輯介面和匯出的 HTML 共用同一份。
 */

// [開花時的角度, 合起來時的角度]：五瓣花攤開 → 往上收成鬱金香形的花苞。
// 用 ±144 而不是 216/288，花瓣才會走最短的路收合，不會整圈轉。
const PETALS: [number, number][] = [
  [144, 12],
  [-144, -12],
  [72, 26],
  [-72, -26],
  [0, 0],
]

export function bloomSvg(): string {
  const petals = PETALS.map(
    ([open, closed]) =>
      `<ellipse class="bloom-petal" cx="12" cy="5" rx="3.4" ry="4.6" style="--open:${open}deg;--closed:${closed}deg"/>`,
  ).join('')

  return `<svg class="bloom" viewBox="0 0 24 28" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
<path class="bloom-stem" d="M12 12c0 5-.6 9 0 14.5" fill="none" stroke-width="1.6" stroke-linecap="round"/>
<path class="bloom-leaf" d="M12 20.5c2.4-2.4 5.4-2.4 6.6-1.2-1.8 2-4.6 2.4-6.6 1.2Z"/>
<path class="bloom-sepal" d="M8.6 10.8q3.4 5 6.8 0-3.4 1.8-6.8 0Z"/>
${petals}
<circle class="bloom-center" cx="12" cy="10" r="2.8"/>
</svg>`
}
