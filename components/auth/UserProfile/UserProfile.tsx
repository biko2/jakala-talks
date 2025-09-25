'use client'

import { createBrowserClient } from '@/lib/supabase/client'
import { User } from '@supabase/supabase-js'
import { useRouter } from 'next/navigation'
import { useState } from 'react'
import {
  ProfileContainer,
  ProfileContent,
  AvatarContainer,
  Avatar,
  UserInfo,
  UserName,
  LogoutButton,
  StateLayer
} from './UserProfile.styles'

interface UserProfileProps {
  user: User
}

export default function UserProfile({ user }: UserProfileProps) {
  const [loading, setLoading] = useState(false)
  const supabase = createBrowserClient()
  const router = useRouter()

  const handleLogout = async () => {
    setLoading(true)
    try {
      await supabase.auth.signOut()
      router.push('/')
    } catch (error) {
      console.error('Error durante logout:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <ProfileContainer>
      <ProfileContent>
        {user.user_metadata?.avatar_url && (
          <AvatarContainer>
            <Avatar
              src={user.user_metadata.avatar_url}
              alt={user.user_metadata?.full_name || user.email}
            />
          </AvatarContainer>
        )}
        <UserInfo>
          <UserName>
            {user.user_metadata?.full_name || user.email}
          </UserName>
          <LogoutButton
            onClick={handleLogout}
            disabled={loading}
          >
            <StateLayer />
            {loading ? 'Cerrando...' : 'Cerrar sesión'}
          </LogoutButton>
        </UserInfo>
      </ProfileContent>
    </ProfileContainer>
  )
}
