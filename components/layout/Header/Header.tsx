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
import { VotingStatus } from '@/src/domain/valueObjects/VotingRules'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

interface HeaderProps {
  user: User | null
  onNewTalkClick?: () => void
  canCreateNewTalks?: boolean
  votingStatus?: VotingStatus
  closingDate?: Date | null
}

function formatDate(date: Date): string {
  const day = date.toLocaleDateString('es-ES', { day: 'numeric', timeZone: 'UTC' })
  const month = date.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  return `${day} de ${capitalizedMonth}`
}

export default function Header({ user, onNewTalkClick, canCreateNewTalks = true, votingStatus, closingDate }: HeaderProps) {
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

  const deadlineCopy = closingDate
    ? ` El último dia para votar es el ${formatDate(new Date(closingDate.getTime() - 24 * 60 * 60 * 1000))}.`
    : ''

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
          {votingStatus === 'closed' ? (
            <>
              <InfoPargraph>
                La <span style={{ fontWeight: 800 }}>votación ha finalizado</span>. Gracias por participar en el Rincón de Charlas.
              </InfoPargraph>

              <InfoPargraph>
                Las charlas siguen visibles abajo. Pronto compartiremos los resultados del Open Space.
              </InfoPargraph>
            </>
          ) : votingStatus === 'voting' ? (
            <>
              <InfoPargraph>
                Buenas noticias, el Open Space ha entrado en la siguiente fase: ya ha comenzado el <span style={{fontWeight: 800}}>proceso de votación</span> de charlas. 
              </InfoPargraph>

              <InfoPargraph>
                1. Antes que nada, para poder votar, tendrás que <span style={{fontWeight: 800}}>REGISTRATE UTILIZANDO TU CUENTA DE GOOGLE</span> clicando en el link que tienes un poco más abajo. 
              </InfoPargraph>

              <InfoPargraph>
                2. Entre todas las charlas que hay, <span style={{fontWeight: 800}}>BUSCA</span> cuáles te llaman más la atención. Recuerda que no hay opciones buenas ni malas: lo importante es que te motive.
              </InfoPargraph>

              <InfoPargraph>
                3. <span style={{fontWeight: 800}}>SELECCIONA TRES VÓTALAS Y VOILÁ.</span> Ya habrás contribuido a hacer el evento que quieres.
              </InfoPargraph>
            </>
          ) : (
            <>
              <InfoPargraph>
                ¿Tienes una idea? ¿Quieres abrir un debate? ¿Te gustaría enseñarnos algo que hayas aprendido o de lo que eres experto o experta?
              </InfoPargraph>

              <InfoPargraph>
                Este es tu espacio. <span style={{ fontWeight: 800 }}>Al Open Space no vienes solo a consumir contenido, también vienes a construirlo</span>
              </InfoPargraph>

              <InfoPargraph>
                <span style={{ fontWeight: 800 }}>Aquí caben más cosas de las que imaginas.</span> IA, agentes, diseño, productividad, cómo hablar en público, fotografía analógica, café de especialidad, finanzas personales, Lego vs Playmobil, primeros auxilios o ese hobby del que podrías hablar durante horas. Si aporta, interesa.
              </InfoPargraph>
            </>
          )}
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

        {!user && !EnvironmentDetector.isMswEnabled() && (
          <FourthLine>
            {votingStatus === 'closed' ? (
              <span>
                <strong>La votación ha finalizado.</strong> Puedes iniciar sesión con Google si lo necesitas.
              </span>
            ) : votingStatus === 'voting' ? (
              <span>
                <strong>¡El periodo de votación ha comenzado!</strong> Iniciar sesión con Google para poder votar en las charlas.{deadlineCopy}
              </span>
            ) : (
              <span>
                ¡IMPORTANTE! Debes <strong>iniciar sesión con Google</strong> para poder proponer charlas y luego votar.
              </span>
            )}
       
            <GoogleSignInButtonOfficial disabled={loading} onClick={handleGoogleLogin} />
          </FourthLine>
        )}
      </InfoSection>
    </Container>
  )
}
