import React from 'react'
import { NewTalkButton } from './NewTalk.styles'

interface NewTalkProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
  ariaLabel?: string
}

export default function NewTalk({
  children,
  onClick,
  disabled = false,
  type = 'button',
  ariaLabel
}: NewTalkProps) {
  return (
    <NewTalkButton
      onClick={onClick}
      disabled={disabled}
      type={type}
      aria-label={ariaLabel}
    >
      {children}
    </NewTalkButton>
  )
}
