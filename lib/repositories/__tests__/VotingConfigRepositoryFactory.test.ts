import { VotingConfigRepositoryFactory } from '../VotingConfigRepositoryFactory'
import { createBrowserClient } from '@/lib/supabase/client'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'

jest.mock('@/lib/supabase/client')

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('VotingConfigRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('debería devolver SupabaseVotingConfigRepository', () => {
      const mockSupabaseClient = { from: jest.fn() }
      mockCreateBrowserClient.mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof createBrowserClient>
      )

      const repository = VotingConfigRepositoryFactory.create()

      expect(repository).toBeInstanceOf(SupabaseVotingConfigRepository)
      expect(mockCreateBrowserClient).toHaveBeenCalled()
    })

    it('debería devolver SupabaseVotingConfigRepository aunque MSW esté activo', () => {
      delete process.env.NEXT_PUBLIC_USE_SUPABASE
      const mockSupabaseClient = { from: jest.fn() }
      mockCreateBrowserClient.mockReturnValue(
        mockSupabaseClient as unknown as ReturnType<typeof createBrowserClient>
      )

      const repository = VotingConfigRepositoryFactory.create()

      expect(repository).toBeInstanceOf(SupabaseVotingConfigRepository)
    })
  })

  describe('createForTesting', () => {
    it('debería crear InMemoryVotingConfigRepository con configuración por defecto', () => {
      const repository = VotingConfigRepositoryFactory.createForTesting()

      expect(repository).toBeInstanceOf(InMemoryVotingConfigRepository)
    })

    it('debería crear InMemoryVotingConfigRepository con configuración personalizada', () => {
      const customConfig = {
        votingStartDate: new Date('2025-12-01T00:00:00.000Z'),
        maxVotesPerUser: 5,
        proposingStartDate: new Date('2025-11-01T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z'),
      }

      const repository = VotingConfigRepositoryFactory.createForTesting(customConfig)

      expect(repository).toBeInstanceOf(InMemoryVotingConfigRepository)
    })
  })
})
