// 側欄「花園」用的圖示：盆栽（分類）、花瓣（筆記）、嫩芽（新增分類）；花也用在 Logo 與訊息

// 五片花瓣的圓心，和 Logo 裡的小花一樣是五瓣
const PETALS: [number, number][] = [
  [12, 6.5],
  [17.23, 10.3],
  [15.23, 16.45],
  [8.77, 16.45],
  [6.77, 10.3],
]

export type MessageTone = 'info' | 'success' | 'warning' | 'error'

const TONE_COLORS: Record<MessageTone, string> = {
  info: 'var(--app-info)',
  success: 'var(--app-success)',
  warning: 'var(--app-warn)',
  error: 'var(--app-danger)',
}

/** The garden flower recoloured for messages: blue info, green success, yellow warning, red error. */
export function MessageFlower({ tone, size = 18 }: { tone: MessageTone; size?: number }) {
  return (
    <svg className="message-flower" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {PETALS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4.6} fill={TONE_COLORS[tone]} />
      ))}
      <ellipse cx={6.2} cy={9.3} rx={1.1} ry={0.7} fill="#fff" opacity={0.55} transform="rotate(-35 6.2 9.3)" />
      <circle cx={12} cy={12} r={3.1} fill="#fffaf2" />
    </svg>
  )
}

export function SproutIcon({ size = 18 }: { size?: number }) {
  return (
    <svg className="garden-sprout" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21v-8" stroke="var(--stem)" strokeWidth={2} strokeLinecap="round" />
      <path d="M12 13C12 8 8.5 5 4 5c0 4.5 3.5 8 8 8Z" fill="none" stroke="var(--leaf)" strokeWidth={1.6} strokeDasharray="2.2 2" />
      <path d="M12 13c0-4 3-6.5 7-6.5 0 3.8-3 6.5-7 6.5Z" fill="none" stroke="var(--leaf)" strokeWidth={1.6} strokeDasharray="2.2 2" />
    </svg>
  )
}

// 開花用的小花：同樣五瓣，縮小後放在花莖頂端 (12, 6.2)
const SMALL_PETALS = PETALS.map(([cx, cy]) => [12 + (cx - 12) * 0.56, 6.2 + (cy - 12) * 0.56] as const)

/** 分類：開花的盆栽，花的顏色跟著分類（見 ui/gardenColors） */
export function PotIcon({ color, size = 20 }: { color: string; size?: number }) {
  return (
    <svg className="garden-pot" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 14V7.4" stroke="var(--leaf-vein)" strokeWidth={1.5} strokeLinecap="round" />
      <path d="M12 12.2c0-2-1.5-3.3-3.6-3.3 0 2 1.5 3.3 3.6 3.3Z" fill="var(--leaf)" />
      <path d="M12 11.4c0-1.8 1.3-3 3.2-3 0 1.8-1.3 3-3.2 3Z" fill="var(--leaf)" />
      {SMALL_PETALS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.6} fill={color} />
      ))}
      <circle cx={12} cy={6.2} r={1.7} fill="var(--petal-center)" />
      <path d="M6.3 15.8h11.4l-1.5 6.2H7.8Z" fill="var(--pot)" />
      <rect x={5} y={13.6} width={14} height={2.8} rx={1} fill="var(--pot-rim)" />
    </svg>
  )
}

/** 筆記：一片花瓣，顏色和所屬分類的花一樣 */
export function PetalIcon({ color, size = 14 }: { color: string; size?: number }) {
  return (
    <svg className="garden-petal" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 21.5C6.6 18.6 4.6 13.4 6.4 8.6 7.6 5.3 9.8 3.4 12 2.5c2.2.9 4.4 2.8 5.6 6.1 1.8 4.8-.2 10-5.6 12.9Z" fill={color} />
      <path d="M12 19.5V8" stroke="#fff" strokeWidth={1.2} strokeLinecap="round" opacity={0.55} />
    </svg>
  )
}
