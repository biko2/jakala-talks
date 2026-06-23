'use client'

import { Talk } from '@/src/domain/entities/Talk'
import TalkCard from '../TalkCard'
import { Container, EmptyTalksListHeader, Header, List, VotingStatus } from './TalksList.styles'

interface TalksListProps {
  talks: Talk[]
  onVote?: (talkId: string) => void
  isLoggedIn?: boolean
  userVotes?: string[]
  maxVotesPerUser?: number
  isVotingEnabled?: boolean
  votingStartDate?: Date
}

function formatVotingStartDate(date: Date): string {
  const day = date.toLocaleDateString('es-ES', { day: 'numeric', timeZone: 'UTC' })
  const month = date.toLocaleDateString('es-ES', { month: 'long', timeZone: 'UTC' })
  const capitalizedMonth = month.charAt(0).toUpperCase() + month.slice(1)
  return `${day} de ${capitalizedMonth}`
}

export default function TalksList({
  talks,
  onVote,
  isLoggedIn = false,
  userVotes = [],
  maxVotesPerUser = 3,
  isVotingEnabled = true,
  votingStartDate,
}: TalksListProps) {
  const remainingVotes = maxVotesPerUser - userVotes.length

  const getVotingMessage = () => {
    if (!isVotingEnabled) {
      return votingStartDate
        ? `La votación estará habilitada el ${formatVotingStartDate(votingStartDate)}`
        : 'La votación aún no está habilitada'
    }

    if (isLoggedIn) {
      return `Has votado ${userVotes.length} de ${maxVotesPerUser} charlas${remainingVotes > 0 ? ` (${remainingVotes} votos restantes)` : ''
        }`
    }
  }

  return (
    <Container>
      {(!isVotingEnabled || isLoggedIn) && (
        <VotingStatus>
          {getVotingMessage()}
        </VotingStatus>
      )}
      {talks.length === 0
        ? <EmptyTalksListHeader>No hay charlas... todavía</EmptyTalksListHeader>
        : <>
          <Header>Todas las charlas</Header>
          <List>
            {talks.map(talk => (
              <TalkCard
                key={talk.id}
                talk={talk}
                onVote={onVote}
                isLoggedIn={isLoggedIn}
                isVoted={userVotes.includes(talk.id)}
                isVotingEnabled={isVotingEnabled}
              />
            ))}
          </List>
        </>
      }
    </Container>
  )
}
