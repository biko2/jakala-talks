import { MOCK_TALKS, MOCK_USER_VOTES } from '../talks'
import { MOCK_USER } from '../user'

export interface TalkRow {
  id: string
  title: string
  description: string
  author: string
  duration: number
  created_at: string
  updated_at: string
}

export interface UserVoteRow {
  id: string
  user_id: string
  talk_id: string
  created_at: string
}

export interface VotingConfigRow {
  id: string
  voting_start_date: string
  max_votes_per_user: number
  proposing_talks_start_date: string
  closing_date: string | null
  created_at: string
}

export interface MockDatabase {
  talks: TalkRow[]
  user_votes: UserVoteRow[]
  voting_config: VotingConfigRow[]
}

export type TableName = keyof MockDatabase

const SEED_TIMESTAMP = '2026-06-29T00:00:00.000Z'

function seedTalks(): TalkRow[] {
  return MOCK_TALKS.map((talk, index) => {
    const createdAt = new Date(Date.parse(SEED_TIMESTAMP) - index * 60_000).toISOString()
    return {
      id: talk.id,
      title: talk.title,
      description: talk.description,
      author: talk.author,
      duration: talk.duration,
      created_at: createdAt,
      updated_at: createdAt,
    }
  })
}

function seedUserVotes(): UserVoteRow[] {
  return MOCK_TALKS.flatMap(talk => {
    const mockUserVoted = MOCK_USER_VOTES.includes(talk.id)
    const otherVoters = talk.votes - (mockUserVoted ? 1 : 0)
    const voters = [
      ...(mockUserVoted ? [MOCK_USER.id] : []),
      ...Array.from({ length: otherVoters }, (_, index) => `seed-user-${index + 1}`),
    ]
    return voters.map(userId => ({
      id: `seed-vote-${talk.id}-${userId}`,
      user_id: userId,
      talk_id: talk.id,
      created_at: SEED_TIMESTAMP,
    }))
  })
}

function seedVotingConfig(): VotingConfigRow[] {
  return [
    {
      id: 'seed-voting-config',
      voting_start_date: '2026-09-04T00:00:00.000Z',
      max_votes_per_user: 3,
      proposing_talks_start_date: '2026-06-29T00:00:00.000Z',
      closing_date: '2026-09-08T00:00:00.000Z',
      created_at: SEED_TIMESTAMP,
    },
  ]
}

function createSeed(): MockDatabase {
  return {
    talks: seedTalks(),
    user_votes: seedUserVotes(),
    voting_config: seedVotingConfig(),
  }
}

export const db: MockDatabase = createSeed()

export function resetDb(): void {
  Object.assign(db, createSeed())
}
