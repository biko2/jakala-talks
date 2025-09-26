import { ITalkRepository } from "../../domain/ports/TalkRepository"

export class GetUserVotes {
  constructor(private readonly talkRepository: ITalkRepository) { }

  async execute(userId: string): Promise<string[]> {
    return await this.talkRepository.getUserVotes(userId)
  }
}

