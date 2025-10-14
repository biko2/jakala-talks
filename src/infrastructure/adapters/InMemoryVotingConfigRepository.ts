import { VotingConfigRepository, VotingConfig } from '../../domain/ports/VotingConfigRepository'

export class InMemoryVotingConfigRepository implements VotingConfigRepository {
  private config: VotingConfig

  constructor(config: VotingConfig) {
    this.config = config
  }

  async getVotingConfig(): Promise<VotingConfig> {
    return this.config
  }
}

