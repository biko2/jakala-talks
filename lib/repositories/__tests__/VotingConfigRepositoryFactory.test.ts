import { VotingConfigRepositoryFactory } from '../VotingConfigRepositoryFactory'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'

jest.mock('@/lib/environment/EnvironmentDetector')
jest.mock('@/lib/supabase/client')
jest.mock('@/src/infrastructure/adapters/SupabaseVotingConfigRepository')
jest.mock('@/src/infrastructure/adapters/InMemoryVotingConfigRepository')

describe('VotingConfigRepositoryFactory', () => {
  const { EnvironmentDetector } = require('@/lib/environment/EnvironmentDetector')
  const { createBrowserClient } = require('@/lib/supabase/client')

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('debería crear InMemoryVotingConfigRepository en modo mock', () => {
      EnvironmentDetector.getEnvironmentType.mockReturnValue('mock')

      VotingConfigRepositoryFactory.create()

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith({
        votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
        maxVotesPerUser: 3
      })
    })

    it('debería crear SupabaseVotingConfigRepository en modo local-supabase', () => {
      EnvironmentDetector.getEnvironmentType.mockReturnValue('local-supabase')
      const mockSupabaseClient = { from: jest.fn() }
      createBrowserClient.mockReturnValue(mockSupabaseClient)

      VotingConfigRepositoryFactory.create()

      expect(createBrowserClient).toHaveBeenCalled()
      expect(SupabaseVotingConfigRepository).toHaveBeenCalledWith(mockSupabaseClient)
    })

    it('debería crear SupabaseVotingConfigRepository en modo production', () => {
      EnvironmentDetector.getEnvironmentType.mockReturnValue('production')
      const mockSupabaseClient = { from: jest.fn() }
      createBrowserClient.mockReturnValue(mockSupabaseClient)

      VotingConfigRepositoryFactory.create()

      expect(createBrowserClient).toHaveBeenCalled()
      expect(SupabaseVotingConfigRepository).toHaveBeenCalledWith(mockSupabaseClient)
    })

    it('debería lanzar error para entorno no soportado', () => {
      EnvironmentDetector.getEnvironmentType.mockReturnValue('unknown')

      expect(() => VotingConfigRepositoryFactory.create())
        .toThrow('Entorno no soportado: unknown')
    })
  })

  describe('createForTesting', () => {
    it('debería crear InMemoryVotingConfigRepository con configuración por defecto', () => {
      VotingConfigRepositoryFactory.createForTesting()

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith({
        votingStartDate: new Date('2025-10-07T00:00:00.000Z'),
        maxVotesPerUser: 3
      })
    })

    it('debería crear InMemoryVotingConfigRepository con configuración personalizada', () => {
      const customConfig = {
        votingStartDate: new Date('2025-12-01T00:00:00.000Z'),
        maxVotesPerUser: 5
      }

      VotingConfigRepositoryFactory.createForTesting(customConfig)

      expect(InMemoryVotingConfigRepository).toHaveBeenCalledWith(customConfig)
    })
  })
})

