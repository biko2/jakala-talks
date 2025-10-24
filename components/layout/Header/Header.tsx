'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import UserProfile from '@/components/auth/UserProfile'
import { Banner, Container, InfoSection, Logo, LogoRow, OpenSpaceLink, MainTitle, Subtitle, RightSection, SecondLine, ThirdLine } from './Header.styles'
import { GoogleSignInButtonOfficial } from '@/components/google/GoogleSignInButton/GoogleSignInButton'
import Icon from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client/browser'
import { getAppUrl } from '@/lib/supabase/config/env'
import NewTalk from '@/components/NewTalk'

interface HeaderProps {
  user: User | null
  onNewTalkClick?: () => void
  canCreateNewTalks?: boolean
}

export default function Header({ user, onNewTalkClick, canCreateNewTalks = true }: HeaderProps) {
  const [loading, setLoading] = useState(false)

  const handleGoogleLogin = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${getAppUrl()}/auth/callback`,
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
      <InfoSection>
        <LogoRow>
          <Logo src="/Logo.svg" alt="Jakala Logo" />
          <OpenSpaceLink href="https://open-space.jakala.es/" target="_blank" rel="noopener noreferrer">
            Open de Jakala
          </OpenSpaceLink>
        </LogoRow>

        <SecondLine>
          <MainTitle>Rincón de Charlas</MainTitle>
          <RightSection>
            <Subtitle>
              {user && (
                <UserProfile user={user} />
              )}
            </Subtitle>
            {user && onNewTalkClick && canCreateNewTalks && (
              <NewTalk onClick={onNewTalkClick} ariaLabel="Nueva charla">
                <Icon icon={Plus} size={30} color="white" />
              </NewTalk>
            )}


          </RightSection>
        </SecondLine>

        {!user && (
          <ThirdLine>
            <span>¡IMPORTANTE! Debes <strong>iniciar sesión con Google</strong> para poder votar.</span>
            <GoogleSignInButtonOfficial disabled={loading} onClick={handleGoogleLogin} />
          </ThirdLine>
        )}
      </InfoSection>
    </Container>
  )
}
