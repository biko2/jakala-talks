import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"
import { UserVote } from "../../domain/entities/UserVote"
import { SupabaseClient } from "@supabase/supabase-js"

interface TalkRow {
  id: string
  title: string
  description: string
  author: string
  duration: number
  created_at: string
  updated_at: string
}

interface UserVoteRow {
  id: string
  user_id: string
  talk_id: string
  created_at: string
}

export class TalkRepository implements ITalkRepository {
  constructor(private supabase: SupabaseClient) { }

  private async getVoteCounts(): Promise<Map<string, number>> {
    const { data, error } = await this.supabase
      .from('user_votes')
      .select('talk_id')

    if (error) {
      throw new Error(`Error al obtener votos: ${error.message}`)
    }

    const voteCounts = new Map<string, number>()

    if (data) {
      data.forEach((vote: { talk_id: string }) => {
        const currentCount = voteCounts.get(vote.talk_id) || 0
        voteCounts.set(vote.talk_id, currentCount + 1)
      })
    }

    return voteCounts
  }

  private mapRowToTalk(row: TalkRow, voteCount: number): Talk {
    return new Talk(
      row.id,
      row.title,
      row.description,
      row.author,
      row.duration,
      voteCount
    )
  }

  async findAll(): Promise<Talk[]> {
    const [talksResult, voteCounts] = await Promise.all([
      this.supabase
        .from('talks')
        .select('*')
        .order('created_at', { ascending: false }),
      this.getVoteCounts()
    ])

    if (talksResult.error) {
      throw new Error(`Error al obtener las talks: ${talksResult.error.message}`)
    }

    if (!talksResult.data) {
      return []
    }

    return talksResult.data.map(row =>
      this.mapRowToTalk(row, voteCounts.get(row.id) || 0)
    )
  }

  async findById(id: string): Promise<Talk | null> {
    const [talkResult, voteCounts] = await Promise.all([
      this.supabase
        .from('talks')
        .select('*')
        .eq('id', id)
        .single(),
      this.getVoteCounts()
    ])

    if (talkResult.error) {
      if (talkResult.error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error al obtener la talk: ${talkResult.error.message}`)
    }

    if (!talkResult.data) {
      return null
    }

    return this.mapRowToTalk(talkResult.data, voteCounts.get(id) || 0)
  }

  async create(talk: Talk): Promise<void> {
    const { error } = await this.supabase
      .from('talks')
      .insert({
        id: talk.id,
        title: talk.title,
        description: talk.description,
        author: talk.author,
        duration: talk.duration
      })

    if (error) {
      throw new Error(`Error al crear la talk: ${error.message}`)
    }
  }

  async addUserVote(userVote: UserVote): Promise<void> {
    const { error } = await this.supabase
      .from('user_votes')
      .insert({
        user_id: userVote.userId,
        talk_id: userVote.talkId,
        created_at: userVote.createdAt.toISOString()
      })

    if (error) {
      throw new Error(`Error al agregar voto de usuario: ${error.message}`)
    }
  }

  async removeUserVote(userId: string, talkId: string): Promise<void> {
    const { error } = await this.supabase
      .from('user_votes')
      .delete()
      .eq('user_id', userId)
      .eq('talk_id', talkId)

    if (error) {
      throw new Error(`Error al eliminar voto de usuario: ${error.message}`)
    }
  }

  async getUserVotes(userId: string): Promise<string[]> {
    const { data, error } = await this.supabase
      .from('user_votes')
      .select('talk_id')
      .eq('user_id', userId)

    if (error) {
      throw new Error(`Error al obtener votos del usuario: ${error.message}`)
    }

    return data.map(row => row.talk_id)
  }

  async hasUserVotedForTalk(userId: string, talkId: string): Promise<boolean> {
    const { data, error } = await this.supabase
      .from('user_votes')
      .select('id')
      .eq('user_id', userId)
      .eq('talk_id', talkId)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return false
      }
      throw new Error(`Error al verificar voto del usuario: ${error.message}`)
    }

    return !!data
  }
}

