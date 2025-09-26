'use client'

import { Talk } from '@/src/domain/entities/Talk'
import { TalkCardStyles } from './TalkCard.styles'

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
    <TalkCardStyles.Container onClick={handleVoteClick}>
      <TalkCardStyles.Header>
        <TalkCardStyles.Title>{talk.title}</TalkCardStyles.Title>
        {isLoggedIn && (
          <TalkCardStyles.VoteIcon $isVoted={isVoted}>
            ❤️
          </TalkCardStyles.VoteIcon>
        )}
      </TalkCardStyles.Header>

      <TalkCardStyles.Description>
        {talk.description}
      </TalkCardStyles.Description>

      <TalkCardStyles.Footer>
        <TalkCardStyles.Author>
          <TalkCardStyles.AuthorIcon>
            👤
          </TalkCardStyles.AuthorIcon>
          <TalkCardStyles.AuthorName>
            {talk.author}
          </TalkCardStyles.AuthorName>
        </TalkCardStyles.Author>

        <TalkCardStyles.Duration>
          <TalkCardStyles.DurationIcon>
            ⏱️
          </TalkCardStyles.DurationIcon>
          <TalkCardStyles.DurationText>
            {talk.duration} min
          </TalkCardStyles.DurationText>
        </TalkCardStyles.Duration>
      </TalkCardStyles.Footer>

      <TalkCardStyles.VotesCount>
        {talk.votes}
      </TalkCardStyles.VotesCount>
    </TalkCardStyles.Container>
  )
}
