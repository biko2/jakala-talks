export interface VotingConfig {
  votingStartDate: Date
  maxVotesPerUser: number
  proposingStartDate: Date
  closingDate: Date | null
}

export interface VotingConfigRepository {
  getVotingConfig(): Promise<VotingConfig>
}
