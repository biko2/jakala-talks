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
}

export default function TalksList({
  talks,
  onVote,
  isLoggedIn = false,
  userVotes = [],
  maxVotesPerUser = 3,
  isVotingEnabled = true,
}: TalksListProps) {
  const remainingVotes = maxVotesPerUser - userVotes.length

  const getVotingMessage = () => {
    if (!isVotingEnabled) {
      return 'La votación estára habilitada el 7 de Noviembre'
    }

    if (isLoggedIn) {
      return `Has votado ${userVotes.length} de ${maxVotesPerUser} charlas${remainingVotes > 0 ? ` (${remainingVotes} votos restantes)` : ''
        }`
    }
  }

  return (
    <Container>
      {isVotingEnabled && !isLoggedIn && (
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
