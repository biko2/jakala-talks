import { ITalkRepository } from "../../domain/ports/TalkRepository"
import { Talk } from "../../domain/entities/Talk"
import { supabase } from "../../../lib/supabase/client/base"

interface TalkRow {
  id: string
  title: string
  description: string
  author: string
  votes: number
  created_at: string
  updated_at: string
}

export class TalkRepository implements ITalkRepository {
  private mapRowToTalk(row: TalkRow): Talk {
    return new Talk(
      row.id,
      row.title,
      row.description,
      row.author,
      row.votes
    )
  }

  async findAll(): Promise<Talk[]> {
    const { data, error } = await supabase
      .from('talks')
      .select('*')
      .order('created_at', { ascending: false })

    if (error) {
      throw new Error(`Error al obtener las talks: ${error.message}`)
    }

    return data.map(row => this.mapRowToTalk(row))
  }

  async findById(id: string): Promise<Talk | null> {
    const { data, error } = await supabase
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

  async incrementVote(talkId: string): Promise<void> {
    const { error } = await supabase.rpc('increment_vote', { talk_id: talkId })

    if (error) {
      throw new Error(`Error al incrementar voto: ${error.message}`)
    }
  }

  async decrementVote(talkId: string): Promise<void> {
    const { error } = await supabase.rpc('decrement_vote', { talk_id: talkId })

    if (error) {
      throw new Error(`Error al decrementar voto: ${error.message}`)
    }
  }
}

