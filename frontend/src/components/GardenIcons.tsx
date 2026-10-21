// 側欄「花園」用的圖示：花（全部筆記 / 目前選取的筆記）、盆栽（分類）、葉子（筆記）、嫩芽（新增分類）

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

/** 分類的盆栽會跟著狀態長大：還沒有筆記是嫩芽，有筆記但收起來是花苞，展開時開花 */
export type PotStage = 'sprout' | 'bud' | 'bloom'

// 開花用的小花：同樣五瓣，縮小後放在花莖頂端 (12, 6.2)
const SMALL_PETALS = PETALS.map(([cx, cy]) => [12 + (cx - 12) * 0.56, 6.2 + (cy - 12) * 0.56] as const)

export function PotIcon({ stage, size = 20 }: { stage: PotStage; size?: number }) {
  return (
    <svg className={`garden-pot garden-pot-${stage}`} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {stage === 'sprout' ? (
        <>
          <path d="M12 14V9.6" stroke="var(--leaf-vein)" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M12 11c0-2.6-1.9-4.3-4.6-4.3 0 2.5 1.9 4.3 4.6 4.3Z" fill="var(--leaf)" />
          <path d="M12 10.1c0-2.2 1.6-3.7 4-3.7 0 2.2-1.6 3.7-4 3.7Z" fill="var(--leaf)" />
        </>
      ) : (
        <>
          <path d="M12 14V7.4" stroke="var(--leaf-vein)" strokeWidth={1.5} strokeLinecap="round" />
          <path d="M12 12.2c0-2-1.5-3.3-3.6-3.3 0 2 1.5 3.3 3.6 3.3Z" fill="var(--leaf)" />
          <path d="M12 11.4c0-1.8 1.3-3 3.2-3 0 1.8-1.3 3-3.2 3Z" fill="var(--leaf)" />
          {stage === 'bud' ? (
            <path d="M12 1.8c2.3 1.9 2.6 4.9 0 6.2-2.6-1.3-2.3-4.3 0-6.2Z" fill="var(--petal)" />
          ) : (
            <>
              {SMALL_PETALS.map(([cx, cy]) => (
                <circle key={`${cx}-${cy}`} cx={cx} cy={cy} r={2.6} fill="var(--petal)" />
              ))}
              <circle cx={12} cy={6.2} r={1.7} fill="var(--petal-center)" />
            </>
          )}
        </>
      )}
      <path d="M6.3 15.8h11.4l-1.5 6.2H7.8Z" fill="var(--pot)" />
      <rect x={5} y={13.6} width={14} height={2.8} rx={1} fill="var(--pot-rim)" />
    </svg>
  )
}
