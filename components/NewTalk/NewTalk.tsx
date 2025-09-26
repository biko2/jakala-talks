import React from 'react'
import { NewTalkButton } from './NewTalk.styles'

interface NewTalkProps {
  children: React.ReactNode
  onClick: () => void
  disabled?: boolean
  type?: 'button' | 'submit' | 'reset'
}

export default function NewTalk({
  children,
  onClick,
  disabled = false,
  type = 'button'
}: NewTalkProps) {
  return (
    <NewTalkButton
      onClick={onClick}
      disabled={disabled}
      type={type}
    >
      {children}
    </NewTalkButton>
  )
}
