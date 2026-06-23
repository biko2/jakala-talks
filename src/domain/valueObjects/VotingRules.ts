import { VotingConfigRepository } from '../ports/VotingConfigRepository'

export class VotingRules {
  public votingStatus: 'voting' | 'proposing' | 'waiting'
  
  constructor(private readonly votingConfigRepo: VotingConfigRepository) { 
    this.votingStatus = 'waiting';
  }

  public async getVotingStatus(): Promise<'voting' | 'proposing' | 'waiting'> {
    const config = await this.votingConfigRepo.getVotingConfig();
    if (new Date() < config.proposingStartDate) {
      this.votingStatus = 'waiting';
    } else if (new Date() < config.votingStartDate) {
      this.votingStatus = 'proposing';
    } else {
      this.votingStatus = 'voting';
    }

    return this.votingStatus;
  }

  public isVotingEnabled(): boolean {
    return this.votingStatus === 'voting'
  }

  async canUserVote(userVotesCount: number): Promise<boolean> {
    const config = await this.votingConfigRepo.getVotingConfig()
    await this.getVotingStatus()
    return this.isVotingEnabled() && userVotesCount < config.maxVotesPerUser
  }

  async canCreateNewTalks(): Promise<boolean> {
    await this.getVotingStatus()
    return !this.isVotingEnabled()
  }

  static hasUserVotedForTalk(userVotes: string[], talkId: string): boolean {
    return userVotes.includes(talkId)
  }

  async validateVoteAction(userVotes: string[], talkId: string, isVoting: boolean): Promise<void> {
    const config = await this.votingConfigRepo.getVotingConfig()
    await this.getVotingStatus()
    const isEnabled = this.isVotingEnabled()

    if (!isEnabled) {
      const formattedDate = config.votingStartDate.toLocaleDateString('es-ES', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      })
      throw new Error(`La votación estará disponible a partir del ${formattedDate}`)
    }

    if (isVoting && !VotingRules.hasUserVotedForTalk(userVotes, talkId)) {
      if (!(await this.canUserVote(userVotes.length))) {
        throw new Error(`Solo puedes votar un máximo de ${config.maxVotesPerUser} charlas`)
      }
    }
  }

  static determineVoteAction(userVotes: string[], talkId: string): boolean {
    return !this.hasUserVotedForTalk(userVotes, talkId)
  }

  async getVotingStatusMessage(): Promise<string> {
    const config = await this.votingConfigRepo.getVotingConfig()
    await this.getVotingStatus()
    const isEnabled = this.isVotingEnabled()

    if (isEnabled) {
      return 'Votación activa'
    }

    const formattedDate = config.votingStartDate.toLocaleDateString('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    })
    return `La votación estará disponible a partir del ${formattedDate}`
  }
}

