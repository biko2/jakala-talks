'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import UserProfile from '@/components/auth/UserProfile'
import { Banner, Container, Content, InfoSection, MainTitle, Subtitle, Title, TitlePrimary, TitleSecondary } from './Header.styles'
import { GoogleSignInButtonOfficial } from '@/components/google/GoogleSignInButton/GoogleSignInButton'
import { supabase } from '@/lib/supabase/client'

interface HeaderProps {
  user: User | null
}

export default function Header({ user }: HeaderProps) {
  const [showLogin, setShowLogin] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleLoginClick = () => {
    setShowLogin(!showLogin)
  }

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      })
      if (error) throw error
    } catch (error) {
      console.error('Error durante login con Google:', error)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Container>
      <Banner>
        <Content>
          <Title>
            <TitlePrimary>Jakala</TitlePrimary>
            <TitleSecondary>Talks</TitleSecondary>
          </Title>
          <Subtitle>Rincón de charlas</Subtitle>
        </Content>
      </Banner>


      <InfoSection>
        <MainTitle>Rincón de Charlas</MainTitle>
        <Subtitle>
          {user ? (
            <UserProfile user={user} />
          ) : (
            <GoogleSignInButtonOfficial disabled={loading} onClick={handleGoogleLogin} />
          )}
        </Subtitle>
      </InfoSection>
    </Container>
  )
}
