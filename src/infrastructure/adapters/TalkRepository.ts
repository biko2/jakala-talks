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
  votes: number
  created_at: string
  updated_at: string
}

export class TalkRepository implements ITalkRepository {
  constructor(private supabase: SupabaseClient) { }

  private mapRowToTalk(row: TalkRow): Talk {
    return new Talk(
      row.id,
      row.title,
      row.description,
      row.author,
      row.duration,
      row.votes
    )
  }

  async findAll(): Promise<Talk[]> {
    const { data, error } = await this.supabase
      .from('talks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error al obtener las talks: ${error.message}`)
    }

    return data.map(row => this.mapRowToTalk(row))
  }

  async findById(id: string): Promise<Talk | null> {
    const { data, error } = await this.supabase
      .from('talks')
      .select('*')
      .eq('id', id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return null
      }
      throw new Error(`Error al obtener la talk: ${error.message}`)
    }

    return this.mapRowToTalk(data)
  }

  async create(talk: Talk): Promise<void> {
    const { error } = await this.supabase
      .from('talks')
      .insert({
        id: talk.id,
        title: talk.title,
        description: talk.description,
        author: talk.author,
        duration: talk.duration,
        votes: talk.votes
      })

    if (error) {
      throw new Error(`Error al crear la talk: ${error.message}`)
    }
  }

  async incrementVote(talkId: string): Promise<void> {
    const { error } = await this.supabase.rpc('increment_vote', { talk_id: talkId })

    if (error) {
      throw new Error(`Error al incrementar voto: ${error.message}`)
    }
  }

  async decrementVote(talkId: string): Promise<void> {
    const { error } = await this.supabase.rpc('decrement_vote', { talk_id: talkId })

    if (error) {
      throw new Error(`Error al decrementar voto: ${error.message}`)
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

