export class VotingRules {
  public static readonly MAX_VOTES_PER_USER = 3
  public static readonly VOTING_START_DATE = new Date('2025-11-07T00:00:00.000Z')

  static isVotingEnabled(): boolean {
    return true;
    return new Date() >= this.VOTING_START_DATE
  }

  static canUserVote(userVotesCount: number): boolean {
    return this.isVotingEnabled() && userVotesCount < this.MAX_VOTES_PER_USER
  }

  static canCreateNewTalks(): boolean {
    return !this.isVotingEnabled()
  }

  static hasUserVotedForTalk(userVotes: string[], talkId: string): boolean {
    return userVotes.includes(talkId)
  }

  static validateVoteAction(userVotes: string[], talkId: string, isVoting: boolean): void {
    if (!this.isVotingEnabled()) {
      throw new Error('La votación estará disponible a partir del 7 de noviembre de 2025')
    }

    if (isVoting && !this.hasUserVotedForTalk(userVotes, talkId)) {
      if (!this.canUserVote(userVotes.length)) {
        throw new Error(`Solo puedes votar un máximo de ${this.MAX_VOTES_PER_USER} charlas`)
      }
    }
  }

  static determineVoteAction(userVotes: string[], talkId: string): boolean {
    return !this.hasUserVotedForTalk(userVotes, talkId)
  }

  static getVotingStatusMessage(): string {
    return this.isVotingEnabled()
      ? 'Votación activa'
      : 'La votación estará disponible a partir del 7 de noviembre de 2025'
  }
}

