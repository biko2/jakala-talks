import { ITalkRepository } from "../../domain/ports/TalkRepository"

export class VoteTalk {
  constructor(private readonly talkRepository: ITalkRepository) { }

  async execute(talkId: string, increment: boolean): Promise<void> {
    if (increment) {
      await this.talkRepository.incrementVote(talkId)
    } else {
      await this.talkRepository.decrementVote(talkId)
    }
  }
}
