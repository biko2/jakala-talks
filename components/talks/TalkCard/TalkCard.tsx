'use client'

import { Talk } from '@/src/domain/entities/Talk'
import { TalkCardStyles } from './TalkCard.styles'

interface TalkCardProps {
  talk: Talk
  onVote?: (talkId: string, isVoted: boolean) => void
  isLoggedIn?: boolean
}

export default function TalkCard({ talk, onVote, isLoggedIn = false }: TalkCardProps) {
  const handleVoteClick = () => {
    if (isLoggedIn && onVote) {
      onVote(talk.id, !talk.isVoted)
    }
  }

  return (
    <TalkCardStyles.Container onClick={handleVoteClick}>
      <TalkCardStyles.Header>
        <TalkCardStyles.Title>{talk.title}</TalkCardStyles.Title>
        {isLoggedIn && (
          <TalkCardStyles.VoteIcon $isVoted={talk.isVoted}>
            ❤️
          </TalkCardStyles.VoteIcon>
        )}
      </TalkCardStyles.Header>

      <TalkCardStyles.Description>
        {talk.description}
      </TalkCardStyles.Description>

      <TalkCardStyles.Author>
        <TalkCardStyles.AuthorIcon>
          👤
        </TalkCardStyles.AuthorIcon>
        <TalkCardStyles.AuthorName>
          {talk.author}
        </TalkCardStyles.AuthorName>
      </TalkCardStyles.Author>
    </TalkCardStyles.Container>
  )
}
