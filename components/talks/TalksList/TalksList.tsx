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
  votingStatus?: 'voting' | 'proposing' | 'waiting'
  votingStartDate?: Date
  proposingStartDate?: Date
}

function formatDate(date: Date | undefined): string {
  if (!date) {
    return ''
  }

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
  votingStatus,
  votingStartDate,
  proposingStartDate
}: TalksListProps) {
  const remainingVotes = maxVotesPerUser - userVotes.length
  const isVotingEnabled = votingStatus === 'voting'

  const getVotingMessage = () => {
    if (votingStatus === 'waiting') {
      return `La propuesta de charlas estará habilitada el ${formatDate(proposingStartDate)}`
    }

    if (votingStatus === 'proposing') {
      return `La votación estará habilitada el ${formatDate(votingStartDate)}`
    }

    return 'La votación aún no está habilitada'
  }

  const votedMessage = `Has votado ${userVotes.length} de ${maxVotesPerUser} charlas${remainingVotes > 0 ? ` (${remainingVotes} votos restantes)` : ''}`

  const statusMessage = isVotingEnabled
    ? (isLoggedIn ? votedMessage : null)
    : getVotingMessage()

  return (
    <Container>
      {statusMessage && (
        <VotingStatus>
          {statusMessage}
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
