import { VotingConfigRepository, VotingConfig } from '../../domain/ports/VotingConfigRepository'
import type { SupabaseClient } from '@supabase/supabase-js'

export class SupabaseVotingConfigRepository implements VotingConfigRepository {
  constructor(private readonly supabase: SupabaseClient) { }

  async getVotingConfig(): Promise<VotingConfig> {
    const { data, error } = await this.supabase
      .from('voting_config')
      .select('voting_start_date, max_votes_per_user')
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      throw new Error(`Error al obtener configuración de votación: ${error.message}`)
    }

    if (!data) {
      throw new Error('No se encontró configuración de votación')
    }

    return {
      votingStartDate: new Date(data.voting_start_date),
      maxVotesPerUser: data.max_votes_per_user
    }
  }
}

