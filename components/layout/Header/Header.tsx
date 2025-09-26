'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import UserProfile from '@/components/auth/UserProfile'
import { VotingRules } from '@/src/domain/valueObjects/VotingRules'
import { Banner, Container, Content, InfoSection, Logo, LogoContainer, MainTitle, Subtitle, LeftSection, RightSection } from './Header.styles'
import { GoogleSignInButtonOfficial } from '@/components/google/GoogleSignInButton/GoogleSignInButton'
import NewTalk from '@/components/NewTalk'
import Icon from '@/components/ui/Icon'
import { createClient } from '@/lib/supabase/client/browser'
import { getAppUrl } from '@/lib/supabase/config/env'

interface HeaderProps {
  user: User | null
  onNewTalkClick?: () => void
}

export default function Header({ user, onNewTalkClick }: HeaderProps) {
  const [loading, setLoading] = useState(false)
  const canCreateNewTalks = VotingRules.canCreateNewTalks()

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
      <Banner>
        <Content>
          <LogoContainer>
            <Logo src="/Jakala logo_rgb_white.png" alt="Jakala Logo" />
          </LogoContainer>
        </Content>
      </Banner>


      <InfoSection>
        <MainTitle>Rincón de Charlas</MainTitle>
        <RightSection>
          <Subtitle>
            {user ? (
              <UserProfile user={user} />
            ) : (
              <GoogleSignInButtonOfficial disabled={loading} onClick={handleGoogleLogin} />
            )}
          </Subtitle>


          {user && onNewTalkClick && canCreateNewTalks && (
            <NewTalk onClick={onNewTalkClick}>
              <Icon icon={Plus} size={30} color="white" />
            </NewTalk>
          )}
        </RightSection>
      </InfoSection>
    </Container>
  )
}
