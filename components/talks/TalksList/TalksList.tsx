'use client'

import { Talk } from '@/src/domain/entities/Talk'
import { VotingRules } from '@/src/domain/valueObjects/VotingRules'
import TalkCard from '../TalkCard'
import { Container, Header, List, VotingStatus } from './TalksList.styles'

interface TalksListProps {
  talks: Talk[]
  onVote?: (talkId: string) => void
  isLoggedIn?: boolean
  userVotes?: string[]
}

export default function TalksList({ talks, onVote, isLoggedIn = false, userVotes = [] }: TalksListProps) {
  const remainingVotes = VotingRules.MAX_VOTES_PER_USER - userVotes.length
  const isVotingEnabled = VotingRules.isVotingEnabled()

  const getVotingMessage = () => {
    if (!isVotingEnabled) {
      return VotingRules.getVotingStatusMessage()
    }

    return `Has votado ${userVotes.length} de ${VotingRules.MAX_VOTES_PER_USER} charlas${remainingVotes > 0 ? ` (${remainingVotes} votos restantes)` : ''
      }`
  }

  return (
    <Container>
      <Header>Todas las charlas</Header>
      {isLoggedIn && (
        <VotingStatus>
          {getVotingMessage()}
        </VotingStatus>
      )}
      <List>
        {talks.map(talk => (
          <TalkCard
            key={talk.id}
            talk={talk}
            onVote={onVote}
            isLoggedIn={isLoggedIn}
            isVoted={userVotes.includes(talk.id)}
          />
        ))}
      </List>
    </Container>
  )
}
