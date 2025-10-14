import { VotingConfigRepository } from '@/src/domain/ports/VotingConfigRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'
import { createBrowserClient } from '@/lib/supabase/client'

export class VotingConfigRepositoryFactory {
  static create(): VotingConfigRepository {
    const environmentType = EnvironmentDetector.getEnvironmentType()

    switch (environmentType) {
      case 'mock':
        return new InMemoryVotingConfigRepository({
          votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
          maxVotesPerUser: 3
        })

      case 'local-supabase':
      case 'production':
        const supabase = createBrowserClient()
        return new SupabaseVotingConfigRepository(supabase)

      default:
        throw new Error(`Entorno no soportado: ${environmentType}`)
    }
  }

  static createForTesting(config?: { votingStartDate: Date; maxVotesPerUser: number }): VotingConfigRepository {
    return new InMemoryVotingConfigRepository(
      config || {
        votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
        maxVotesPerUser: 3
      }
    )
  }
}

