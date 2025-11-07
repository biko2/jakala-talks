import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { UserVote } from "../../domain/entities/UserVote"
import { VotingRules } from "../../domain/valueObjects/VotingRules"
import { VotingConfigRepository } from "../../domain/ports/VotingConfigRepository"

export class VoteTalk {
  constructor(
    private readonly talkRepository: ITalkRepository,
    private readonly votingConfigRepo: VotingConfigRepository
  ) { }

  async execute(userId: string, talkId: string): Promise<void> {
    const userVotes = await this.talkRepository.getUserVotes(userId)
    const shouldVote = VotingRules.determineVoteAction(userVotes, talkId)

    const votingRules = new VotingRules(this.votingConfigRepo)
    await votingRules.validateVoteAction(userVotes, talkId, shouldVote)

    if (shouldVote) {
      const userVote = new UserVote(userId, talkId)
      await this.talkRepository.addUserVote(userVote)
    } else {
      await this.talkRepository.removeUserVote(userId, talkId)
    }
  }
}
