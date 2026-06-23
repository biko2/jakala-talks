export interface VotingConfig {
  votingStartDate: Date
  maxVotesPerUser: number
  proposingStartDate: Date
}

export interface VotingConfigRepository {
  getVotingConfig(): Promise<VotingConfig>
}

