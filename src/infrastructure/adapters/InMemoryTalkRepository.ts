import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"
import { UserVote } from "../../domain/entities/UserVote"

export class InMemoryTalkRepository implements ITalkRepository {
  private talks: Map<string, Talk> = new Map()
  private userVotes: Map<string, Set<string>> = new Map()

  async findAll(): Promise<Talk[]> {
    return Array.from(this.talks.values())
  }

  async findById(id: string): Promise<Talk | null> {
    return this.talks.get(id) ?? null
  }

  async create(talk: Talk): Promise<void> {
    this.talks.set(talk.id, talk)
  }

  async incrementVote(talkId: string): Promise<void> {
    const talk = this.talks.get(talkId)
    if (!talk) {
      throw new Error('Charla no encontrada')
    }

    const updatedTalk = talk.addVote()
    this.talks.set(talkId, updatedTalk)
  }

  async decrementVote(talkId: string): Promise<void> {
    const talk = this.talks.get(talkId)
    if (!talk) {
      throw new Error('Charla no encontrada')
    }

    const updatedTalk = talk.removeVote()
    this.talks.set(talkId, updatedTalk)
  }

  async addUserVote(userVote: UserVote): Promise<void> {
    if (!this.userVotes.has(userVote.userId)) {
      this.userVotes.set(userVote.userId, new Set())
    }
    this.userVotes.get(userVote.userId)!.add(userVote.talkId)
  }

  async removeUserVote(userId: string, talkId: string): Promise<void> {
    const votes = this.userVotes.get(userId)
    if (votes) {
      votes.delete(talkId)
    }
  }

  async getUserVotes(userId: string): Promise<string[]> {
    const votes = this.userVotes.get(userId)
    return votes ? Array.from(votes) : []
  }

  async hasUserVotedForTalk(userId: string, talkId: string): Promise<boolean> {
    const votes = this.userVotes.get(userId)
    return votes ? votes.has(talkId) : false
  }
}

