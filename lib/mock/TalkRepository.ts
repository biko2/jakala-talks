import { Talk } from '@/src/domain/entities/Talk'
import { UserVote } from '@/src/domain/entities/UserVote'
import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { MOCK_TALKS, MOCK_USER_VOTES } from './talks'

export class MockTalkRepository implements ITalkRepository {
  private talks: Talk[] = [...MOCK_TALKS]
  private userVotes: string[] = [...MOCK_USER_VOTES]

  async findAll(): Promise<Talk[]> {
    return [...this.talks]
  }

  async findById(id: string): Promise<Talk | null> {
    return this.talks.find(talk => talk.id === id) || null
  }

  async create(talk: Talk): Promise<void> {
    this.talks.push(talk)
  }

  async incrementVote(talkId: string): Promise<void> {
    const talk = this.talks.find(t => t.id === talkId)
    if (!talk) {
      throw new Error('Charla no encontrada')
    }

    const updatedTalk = talk.addVote()
    const index = this.talks.findIndex(t => t.id === talkId)
    this.talks[index] = updatedTalk
  }

  async decrementVote(talkId: string): Promise<void> {
    const talk = this.talks.find(t => t.id === talkId)
    if (!talk) {
      throw new Error('Charla no encontrada')
    }

    const updatedTalk = talk.removeVote()
    const index = this.talks.findIndex(t => t.id === talkId)
    this.talks[index] = updatedTalk
  }

  async addUserVote(userVote: UserVote): Promise<void> {
    if (!this.userVotes.includes(userVote.talkId)) {
      this.userVotes.push(userVote.talkId)
    }
  }

  async removeUserVote(userId: string, talkId: string): Promise<void> {
    this.userVotes = this.userVotes.filter(id => id !== talkId)
  }

  async getUserVotes(userId: string): Promise<string[]> {
    return [...this.userVotes]
  }

  async hasUserVotedForTalk(userId: string, talkId: string): Promise<boolean> {
    return this.userVotes.includes(talkId)
  }
}
