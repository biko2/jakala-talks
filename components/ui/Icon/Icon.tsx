'use client'

import { LucideIcon } from 'lucide-react'
import { IconContainer } from './Icon.styles'

interface IconProps {
  icon: LucideIcon
  size?: number
  color?: string
  strokeWidth?: number
  className?: string
  onClick?: () => void
}

export default function Icon({
  icon: IconComponent,
  size = 24,
  color,
  strokeWidth = 2,
  className,
  onClick
}: IconProps) {
  return (
    <IconContainer
      onClick={onClick}
      className={className}
      $clickable={!!onClick}
      role={onClick ? 'button' : undefined}
      data-testid="icon-container"
    >
      <IconComponent
        size={size}
        color={color}
        strokeWidth={strokeWidth}
      />
    </IconContainer>
  )
}
