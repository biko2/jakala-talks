import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { UserVote } from "../../domain/entities/UserVote"
import { VotingRules } from "../../domain/valueObjects/VotingRules"

export class VoteTalk {
  constructor(private readonly talkRepository: ITalkRepository) { }

  async execute(userId: string, talkId: string): Promise<void> {
    const userVotes = await this.talkRepository.getUserVotes(userId)
    const shouldVote = VotingRules.determineVoteAction(userVotes, talkId)

    VotingRules.validateVoteAction(userVotes, talkId, shouldVote)

    if (shouldVote) {
      const userVote = new UserVote(userId, talkId)
      await this.talkRepository.addUserVote(userVote)
      await this.talkRepository.incrementVote(talkId)
    } else {
      await this.talkRepository.removeUserVote(userId, talkId)
      await this.talkRepository.decrementVote(talkId)
    }
  }
}
