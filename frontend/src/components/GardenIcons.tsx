// 側欄「花園」用的圖示：花（全部筆記 / 目前選取的筆記）、葉子（分類 / 筆記）、嫩芽（新增分類）

// 五片花瓣的圓心，和 Logo 裡的小花一樣是五瓣
const PETALS: [number, number][] = [
  [12, 6.5],
  [17.23, 10.3],
  [15.23, 16.45],
  [8.77, 16.45],
  [6.77, 10.3],
]

export function FlowerIcon({ size = 24 }: { size?: number }) {
  return (
    <svg className="garden-flower" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {PETALS.map(([cx, cy]) => (
        <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={4.6} fill="var(--petal)" />
      ))}
      <ellipse cx={6.2} cy={9.3} rx={1.1} ry={0.7} fill="#fff" opacity={0.55} transform="rotate(-35 6.2 9.3)" />
      <circle cx={12} cy={12} r={3.1} fill="var(--petal-center)" />
    </svg>
  )
}

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

interface LeafIconProps {
  size?: number
  tone?: 'fresh' | 'dry'
}

export function LeafIcon({ size = 18, tone = 'fresh' }: LeafIconProps) {
  const fill = tone === 'dry' ? 'var(--leaf-dry)' : 'var(--leaf)'
  return (
    <svg className="garden-leaf" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M3 21C3 11 10 3.5 21 3c0 11-7.5 18-18 18Z" fill={fill} />
      <path d="M3.5 20.5 15 9" stroke="var(--leaf-vein)" strokeWidth={1.4} strokeLinecap="round" fill="none" />
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
