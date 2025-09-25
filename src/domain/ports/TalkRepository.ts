import { Talk } from "../entities/Talk"

export interface ITalkRepository {
  findAll(): Promise<Talk[]>
  findById(id: string): Promise<Talk | null>
  create(talk: Talk): Promise<void>
  incrementVote(talkId: string): Promise<void>
  decrementVote(talkId: string): Promise<void>
}
