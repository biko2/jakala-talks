'use client'

import { useState } from 'react'
import { User } from '@supabase/supabase-js'
import { Plus } from 'lucide-react'
import UserProfile from '@/components/auth/UserProfile'
import { Container, InfoSection, Logo, LogoRow, OpenSpaceLink, MainTitle, Subtitle, RightSection, ThirdLine, FourthLine, InfoPargraph, SecondLine } from './Header.styles'
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
          <InfoPargraph>¿Qué puedes proponer? Lo que quieras: una charla técnica, un debate, ¡COMO SI QUIERES PROPONER UN TALLER DE COCINA! Los asistentes decidirán si sale o no.</InfoPargraph>
          <InfoPargraph>La idea es que estas charlas se lleven a cabo por la mañana en 2 huecos, de 9:30 a 10: 15 (45 minutos) y de 10:30 a 11:00 (30 minutos)</InfoPargraph>
        </SecondLine>

        <ThirdLine>
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
        </ThirdLine>

        {!user && (
          <FourthLine>
            <span>¡IMPORTANTE! Debes <strong>iniciar sesión con Google</strong> para poder proponer charlas y luego votar.</span>
            <GoogleSignInButtonOfficial disabled={loading} onClick={handleGoogleLogin} />
          </FourthLine>
        )}
      </InfoSection>
    </Container>
  )
}
