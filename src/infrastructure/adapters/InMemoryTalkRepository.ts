import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"
import { UserVote } from "../../domain/entities/UserVote"

export class InMemoryTalkRepository implements ITalkRepository {
  private talks: Map<string, Talk> = new Map()
  private userVotes: Map<string, Set<string>> = new Map()

  private countVotesForTalk(talkId: string): number {
    let count = 0
    for (const votes of this.userVotes.values()) {
      if (votes.has(talkId)) {
        count++
      }
    }
    return count
  }

  async findAll(): Promise<Talk[]> {
    const talks = Array.from(this.talks.values())
    return talks.map(talk => new Talk(
      talk.id,
      talk.title,
      talk.description,
      talk.author,
      talk.duration,
      this.countVotesForTalk(talk.id)
    ))
  }

  async findById(id: string): Promise<Talk | null> {
    const talk = this.talks.get(id)
    if (!talk) {
      return null
    }
    return new Talk(
      talk.id,
      talk.title,
      talk.description,
      talk.author,
      talk.duration,
      this.countVotesForTalk(talk.id)
    )
  }

  async create(talk: Talk): Promise<void> {
    this.talks.set(talk.id, talk)
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

