'use client'

import { Talk } from '@/src/domain/entities/Talk'
import TalkCard from '../TalkCard'
import { Container, Header, List } from './TalksList.styles'

interface TalksListProps {
  talks: Talk[]
  onVote?: (talkId: string, isVoted: boolean) => void
  isLoggedIn?: boolean
}

export default function TalksList({ talks, onVote, isLoggedIn = false }: TalksListProps) {
  return (
    <Container>
      <Header>Todas las charlas</Header>
      <List>
        {talks.map(talk => (
          <TalkCard
            key={talk.id}
            talk={talk}
            onVote={onVote}
            isLoggedIn={isLoggedIn}
            isVoted={false}
          />
        ))}
      </List>
    </Container>
  )
}
