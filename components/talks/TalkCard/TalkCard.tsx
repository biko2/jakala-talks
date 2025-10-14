'use client'

import { Heart, User, Clock } from 'lucide-react'
import { Talk } from '@/src/domain/entities/Talk'
import { Author, AuthorName, Container, Description, Duration, DurationIcon, DurationText, Footer, Header, Title, VoteIcon, VotesCount } from './TalkCard.styles'
import Icon from '@/components/ui/Icon'
import DecorativeCircles from '@/components/ui/DecorativeCircles'

interface TalkCardProps {
  talk: Talk
  onVote?: (talkId: string) => void
  isLoggedIn?: boolean
  isVoted?: boolean
  isVotingEnabled?: boolean
}

export default function TalkCard({ talk, onVote, isLoggedIn = false, isVoted = false, isVotingEnabled = true }: TalkCardProps) {

  const handleVoteClick = () => {
    if (isLoggedIn && onVote && isVotingEnabled) {
      onVote(talk.id)
    }
  }

  return (
    <Container onClick={handleVoteClick} $isClickable={isLoggedIn && isVotingEnabled}>
      {isVotingEnabled && (
        <DecorativeCircles
          count={talk.votes}
        />
      )}

      <Header>
        <Title>{talk.title}</Title>
        {isLoggedIn && isVotingEnabled && (
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

      {isVotingEnabled && (
        <VotesCount>
          {talk.votes}
        </VotesCount>
      )}
    </Container>
  )
}
