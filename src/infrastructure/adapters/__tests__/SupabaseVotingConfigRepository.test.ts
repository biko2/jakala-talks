import { SupabaseVotingConfigRepository } from '../SupabaseVotingConfigRepository'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('SupabaseVotingConfigRepository', () => {
  let repository: SupabaseVotingConfigRepository
  let mockQuery: {
    select: jest.Mock
    order: jest.Mock
    limit: jest.Mock
    single: jest.Mock
  }
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    mockQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn().mockReturnThis(),
      limit: jest.fn().mockReturnThis(),
      single: jest.fn()
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue(mockQuery)
    } as unknown as SupabaseClient

    repository = new SupabaseVotingConfigRepository(mockSupabase)
  })

  describe('getVotingConfig', () => {
    it('debería obtener la configuración de votación correctamente', async () => {
      const mockData = {
        voting_start_date: '2025-11-07',
        max_votes_per_user: 3,
        proposing_talks_start_date: '2025-06-24',
        closing_date: '2026-09-08'
      }

      mockQuery.single.mockResolvedValue({
        data: mockData,
        error: null
      })

      const result = await repository.getVotingConfig()

      expect(mockSupabase.from).toHaveBeenCalledWith('voting_config')
      expect(mockQuery.select).toHaveBeenCalledWith(
        'voting_start_date, max_votes_per_user, proposing_talks_start_date, closing_date'
      )
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQuery.limit).toHaveBeenCalledWith(1)
      expect(mockQuery.single).toHaveBeenCalled()

      expect(result).toEqual({
        votingStartDate: new Date('2025-11-07'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2025-06-24'),
        closingDate: new Date('2026-09-08')
      })
    })

    it('debería mapear closing_date null a closingDate null', async () => {
      const mockData = {
        voting_start_date: '2025-11-07',
        max_votes_per_user: 3,
        proposing_talks_start_date: '2025-06-24',
        closing_date: null
      }

      mockQuery.single.mockResolvedValue({
        data: mockData,
        error: null
      })

      const result = await repository.getVotingConfig()

      expect(result.closingDate).toBeNull()
    })

    it('debería lanzar error si hay un error en la consulta', async () => {
      const mockError = { message: 'Database error' }

      mockQuery.single.mockResolvedValue({
        data: null,
        error: mockError
      })

      await expect(repository.getVotingConfig())
        .rejects.toThrow('Error al obtener configuración de votación: Database error')
    })

    it('debería lanzar error si no se encuentra configuración', async () => {
      mockQuery.single.mockResolvedValue({
        data: null,
        error: null
      })

      await expect(repository.getVotingConfig())
        .rejects.toThrow('No se encontró configuración de votación')
    })
  })
})

