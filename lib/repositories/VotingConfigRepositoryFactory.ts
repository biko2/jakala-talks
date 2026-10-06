import { VotingConfigRepository } from '@/src/domain/ports/VotingConfigRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'
import { createBrowserClient } from '@/lib/supabase/client'

export class VotingConfigRepositoryFactory {
  static create(): VotingConfigRepository {
    const supabase = createBrowserClient()
    return new SupabaseVotingConfigRepository(supabase)
  }

  static createForTesting(config?: {
    votingStartDate: Date
    maxVotesPerUser: number
    proposingStartDate: Date
    closingDate: Date | null
  }): VotingConfigRepository {
    return new InMemoryVotingConfigRepository(
      config || {
        votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2026-06-29T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z'),
      }
    )
  }
}
