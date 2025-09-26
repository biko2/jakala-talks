export class VotingRules {
  public static readonly MAX_VOTES_PER_USER = 3

  static canUserVote(userVotesCount: number): boolean {
    return userVotesCount < this.MAX_VOTES_PER_USER
  }

  static hasUserVotedForTalk(userVotes: string[], talkId: string): boolean {
    return userVotes.includes(talkId)
  }

  static validateVoteAction(userVotes: string[], talkId: string, isVoting: boolean): void {
    if (isVoting && !this.hasUserVotedForTalk(userVotes, talkId)) {
      if (!this.canUserVote(userVotes.length)) {
        throw new Error(`Solo puedes votar un máximo de ${this.MAX_VOTES_PER_USER} charlas`)
      }
    }
  }

  static determineVoteAction(userVotes: string[], talkId: string): boolean {
    return !this.hasUserVotedForTalk(userVotes, talkId)
  }
}

