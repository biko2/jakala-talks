import { VotingConfigRepositoryFactory } from '../VotingConfigRepositoryFactory'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'
import { createBrowserClient } from '@/lib/supabase/client'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'

jest.mock('@/lib/environment/EnvironmentDetector')
jest.mock('@/lib/supabase/client')
jest.mock('@/src/infrastructure/adapters/SupabaseVotingConfigRepository')
jest.mock('@/src/infrastructure/adapters/InMemoryVotingConfigRepository')

const mockEnvironmentDetector = EnvironmentDetector as jest.Mocked<typeof EnvironmentDetector>
const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('VotingConfigRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('debería crear InMemoryVotingConfigRepository en modo mock', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('mock')

      VotingConfigRepositoryFactory.create()

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith({
        votingStartDate: new Date('2026-09-04T00:00:00.000Z'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2026-06-29T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z')
      })
    })

    it('debería crear SupabaseVotingConfigRepository en modo local-supabase', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('local-supabase')
      const mockSupabaseClient = { from: jest.fn() }
      mockCreateBrowserClient.mockReturnValue(mockSupabaseClient as unknown as ReturnType<typeof createBrowserClient>)

      VotingConfigRepositoryFactory.create()

      expect(mockCreateBrowserClient).toHaveBeenCalled()
      expect(SupabaseVotingConfigRepository).toHaveBeenCalledWith(mockSupabaseClient)
    })

    it('debería crear SupabaseVotingConfigRepository en modo production', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('production')
      const mockSupabaseClient = { from: jest.fn() }
      mockCreateBrowserClient.mockReturnValue(mockSupabaseClient as unknown as ReturnType<typeof createBrowserClient>)

      VotingConfigRepositoryFactory.create()

      expect(mockCreateBrowserClient).toHaveBeenCalled()
      expect(SupabaseVotingConfigRepository).toHaveBeenCalledWith(mockSupabaseClient)
    })

    it('debería lanzar error para entorno no soportado', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue(
        'unknown' as ReturnType<typeof EnvironmentDetector.getEnvironmentType>
      )

      expect(() => VotingConfigRepositoryFactory.create())
        .toThrow('Entorno no soportado: unknown')
    })
  })

  describe('createForTesting', () => {
    it('debería crear InMemoryVotingConfigRepository con configuración por defecto', () => {
      VotingConfigRepositoryFactory.createForTesting()

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith({
        votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2026-06-29T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z')
      })
    })

    it('debería crear InMemoryVotingConfigRepository con configuración personalizada', () => {
      const customConfig = {
        votingStartDate: new Date('2025-12-01T00:00:00.000Z'),
        maxVotesPerUser: 5,
        proposingStartDate: new Date('2025-11-01T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z')
      }

      VotingConfigRepositoryFactory.createForTesting(customConfig)

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith(customConfig)
    })
  })
})

