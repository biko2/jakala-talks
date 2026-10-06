import talksFixture from './fixture/talks.json'
import userVotesFixture from './fixture/user_votes.json'
import votingConfigFixture from './fixture/voting_config.json'

export type TalkRow = (typeof talksFixture)[number]
export type UserVoteRow = (typeof userVotesFixture)[number]
export type VotingConfigRow = (typeof votingConfigFixture)[number]

export type MswStore = {
  talks: TalkRow[]
  userVotes: UserVoteRow[]
  votingConfig: VotingConfigRow
}

export function createStore(): MswStore {
  return {
    talks: structuredClone(talksFixture),
    userVotes: structuredClone(userVotesFixture),
    votingConfig: structuredClone(votingConfigFixture[0]),
  }
}

export function countVotes(store: MswStore): Array<{ talk_id: string; votes: number }> {
  const counts = new Map<string, number>()
  for (const vote of store.userVotes) {
    counts.set(vote.talk_id, (counts.get(vote.talk_id) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([talk_id, votes]) => ({ talk_id, votes }))
}
