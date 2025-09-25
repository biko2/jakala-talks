'use client'

import { GoogleIconStyles } from './GoogleIcon.styles'

type GoogleTheme = 'light' | 'dark' | 'neutral'
type GoogleIconSize = 'large' | 'medium' | 'small'

interface GoogleIconProps {
  theme?: GoogleTheme
  size?: GoogleIconSize
  onClick?: () => void
  disabled?: boolean
  className?: string
}

const GoogleIconSvg = () => (
  <svg width="18" height="18" viewBox="0 0 18 18">
    <path
      fill="#4285F4"
      d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18z"
    />
    <path
      fill="#34A853"
      d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75c-2.09 0-3.86-1.4-4.49-3.31H2v2.08A7.99 7.99 0 0 0 8.98 17z"
    />
    <path
      fill="#FBBC04"
      d="M4.49 10.46A4.77 4.77 0 0 1 4.25 9c0-.51.09-1 .24-1.46V5.46H2a7.98 7.98 0 0 0 0 7.08l2.49-2.08z"
    />
    <path
      fill="#EA4335"
      d="M8.98 3.69c1.18 0 2.23.4 3.06 1.2l2.3-2.3A7.95 7.95 0 0 0 8.98 1a7.99 7.99 0 0 0-6.98 4.46l2.49 2.08c.63-1.9 2.4-3.31 4.49-3.31z"
    />
  </svg>
)

export default function GoogleIcon({
  theme = 'light',
  size = 'large',
  onClick,
  disabled = false,
  className
}: GoogleIconProps) {
  return (
    <GoogleIconStyles.Button
      $theme={theme}
      $size={size}
      onClick={onClick}
      disabled={disabled}
      className={className}
      role="button"
      tabIndex={0}
      aria-label="Acceder con Google"
    >
      <GoogleIconStyles.IconContainer>
        <GoogleIconSvg />
      </GoogleIconStyles.IconContainer>
    </GoogleIconStyles.Button>
  )
}
