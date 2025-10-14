export interface VotingConfig {
  votingStartDate: Date
  maxVotesPerUser: number
}

export interface VotingConfigRepository {
  getVotingConfig(): Promise<VotingConfig>
}

