import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"

export class GetAllTalks {
  constructor(private readonly talkRepository: ITalkRepository) { }

  async execute(): Promise<Talk[]> {
    return await this.talkRepository.findAll()
  }
}
