import fixture from './fixture.json'

export type TalkRow = (typeof fixture.talks)[number]
export type UserVoteRow = (typeof fixture.user_votes)[number]
export type VotingConfigRow = (typeof fixture.voting_config)[number]

export type MswStore = {
  talks: TalkRow[]
  user_votes: UserVoteRow[]
  voting_config: VotingConfigRow[]
}

let store: MswStore = cloneFixture()

function cloneFixture(): MswStore {
  return structuredClone(fixture) as MswStore
}

export function getStore(): MswStore {
  return store
}

export function resetStore(): void {
  store = cloneFixture()
}
