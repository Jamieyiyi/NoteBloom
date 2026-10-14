import type { AppTheme } from '../ui/useAppTheme'
import { bloomSvg } from '../ui/bloom'
import '../ui/bloom.css'

// SVG 是固定字串，只需要產生一次
const BLOOM_HTML = { __html: bloomSvg() }

interface BloomToggleProps {
  theme: AppTheme
  onToggle: () => void
}

/** 明暗切換鈕：暗黑模式時花合起來，切到明亮模式時開花。 */
export function BloomToggle({ theme, onToggle }: BloomToggleProps) {
  const label = theme === 'dark' ? '切換到明亮模式（開花）' : '切換到暗黑模式（花合起來）'
  return (
    <button type="button" className="theme-toggle" title={label} aria-label={label} onClick={onToggle}>
      <span className="bloom-wrap" dangerouslySetInnerHTML={BLOOM_HTML} />
    </button>
  )
}
