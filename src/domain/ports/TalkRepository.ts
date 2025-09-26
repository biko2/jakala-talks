import { Talk } from "../entities/Talk"
import { UserVote } from "../entities/UserVote"

export interface ITalkRepository {
  findAll(): Promise<Talk[]>
  findById(id: string): Promise<Talk | null>
  create(talk: Talk): Promise<void>
  incrementVote(talkId: string): Promise<void>
  decrementVote(talkId: string): Promise<void>
  addUserVote(userVote: UserVote): Promise<void>
  removeUserVote(userId: string, talkId: string): Promise<void>
  getUserVotes(userId: string): Promise<string[]>
  hasUserVotedForTalk(userId: string, talkId: string): Promise<boolean>
}
