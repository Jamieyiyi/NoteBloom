import { ICON_VIEW_BOX } from '../ui/icons'

interface IconProps {
  path: string
  size?: number
}

export function Icon({ path, size = 20 }: IconProps) {
  return (
    <svg width={size} height={size} viewBox={ICON_VIEW_BOX} fill="currentColor" aria-hidden="true">
      <path d={path} />
    </svg>
  )
}
