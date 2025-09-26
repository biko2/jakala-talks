'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  AvatarContainer,
  Avatar,
} from './UserProfile.styles'

interface UserProfileProps {
  user: User
}

export default function UserProfile({ user }: UserProfileProps) {
  const supabase = createBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error durante logout:', error)
    }
  }

  return (
    <>
      {user.user_metadata?.avatar_url && (
        <AvatarContainer>
          <Avatar
            src={user.user_metadata.avatar_url}
            alt={user.user_metadata?.full_name || user.email}
            onClick={handleLogout}
          />
        </AvatarContainer>
      )}
    </>
  )
}
