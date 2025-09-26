'use client'

import { Talk } from '@/src/domain/entities/Talk'
import { Author, AuthorIcon, AuthorName, Container, Description, Duration, DurationIcon, DurationText, Footer, Header, Title, VoteIcon, VotesCount } from './TalkCard.styles'

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
            ❤️
          </VoteIcon>
        )}
      </Header>

      <Description>
        {talk.description}
      </Description>

      <Footer>
        <Author>
          <AuthorIcon>
            👤
          </AuthorIcon>
          <AuthorName>
            {talk.author}
          </AuthorName>
        </Author>

        <Duration>
          <DurationIcon>
            ⏱️
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
