'use client'

import { Heart, User, Clock } from 'lucide-react'
import { Talk } from '@/src/domain/entities/Talk'
import { Author, AuthorIcon, AuthorName, Container, Description, Duration, DurationIcon, DurationText, Footer, Header, Title, VoteIcon, VotesCount } from './TalkCard.styles'
import Icon from '@/components/ui/Icon'

interface TalkCardProps {
  talk: Talk
  onVote?: (talkId: string) => void
  isLoggedIn?: boolean
  isVoted?: boolean
}

export default function TalkCard({ talk, onVote, isLoggedIn = false, isVoted = false }: TalkCardProps) {
  const handleVoteClick = () => {
    if (isLoggedIn && onVote) {
      onVote(talk.id)
    }
  }

  return (
    <Container onClick={handleVoteClick}>
      <Header>
        <Title>{talk.title}</Title>
        {isLoggedIn && (
          <VoteIcon $isVoted={isVoted}>
            <Icon icon={Heart} size={25} color={isVoted ? '#f00a0a' : '#bdc3c7'} strokeWidth={3} />
          </VoteIcon>
        )}
      </Header>

      <Description>
        {talk.description}
      </Description>

      <Footer>
        <Author>
          <Icon icon={User} size={22} color="#6c757d" />
          <AuthorName>
            {talk.author}
          </AuthorName>
        </Author>

        <Duration>
          <DurationIcon>
            <Icon icon={Clock} size={22} color="#6c757d" />
          </DurationIcon>
          <DurationText>
            {talk.duration} min
          </DurationText>
        </Duration>
      </Footer>

      <VotesCount>
        {talk.votes}
      </VotesCount>
    </Container>
  )
}
