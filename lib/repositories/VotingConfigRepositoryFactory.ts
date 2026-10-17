import { VotingConfigRepository } from '@/src/domain/ports/VotingConfigRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { createBrowserClient } from '@/lib/supabase/client'

export class VotingConfigRepositoryFactory {
  static create(): VotingConfigRepository {
    return new SupabaseVotingConfigRepository(createBrowserClient())
  }
}
