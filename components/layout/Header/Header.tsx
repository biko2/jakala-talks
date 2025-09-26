'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import UserProfile from '@/components/auth/UserProfile'
import { Banner, Container, Content, InfoSection, Logo, LogoContainer, MainTitle, Subtitle } from './Header.styles'
import { GoogleSignInButtonOfficial } from '@/components/google/GoogleSignInButton/GoogleSignInButton'
import { createClient } from '@/lib/supabase/client/browser'

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
      const supabase = createClient()
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
          <LogoContainer>
            <Logo src="/Jakala logo_rgb_white.png" alt="Jakala Logo" />
          </LogoContainer>
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
