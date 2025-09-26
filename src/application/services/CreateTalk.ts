import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"
import { VotingRules } from "../../domain/valueObjects/VotingRules"

export class CreateTalk {
  constructor(private readonly talkRepository: ITalkRepository) { }

  async execute(title: string, description: string, author: string, duration: number): Promise<Talk> {
    if (!VotingRules.canCreateNewTalks()) {
      throw new Error("No se pueden crear nuevas charlas cuando la votación está activa")
    }

    if (!title.trim()) {
      throw new Error("El título es obligatorio")
    }
    if (!description.trim()) {
      throw new Error("La descripción es obligatoria")
    }
    if (!author.trim()) {
      throw new Error("El autor es obligatorio")
    }
    if (duration <= 0) {
      throw new Error("La duración debe ser mayor a 0")
    }

    const id = crypto.randomUUID()
    const talk = new Talk(id, title.trim(), description.trim(), author.trim(), duration)

    await this.talkRepository.create(talk)

    return talk
  }
}
