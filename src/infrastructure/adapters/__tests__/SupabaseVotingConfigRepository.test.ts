import { SupabaseVotingConfigRepository } from '../SupabaseVotingConfigRepository'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('SupabaseVotingConfigRepository', () => {
  let repository: SupabaseVotingConfigRepository
  let mockQuery: any
  let mockSupabase: any

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
        max_votes_per_user: 3
      }

      mockQuery.single.mockResolvedValue({
        data: mockData,
        error: null
      })

      const result = await repository.getVotingConfig()

      expect(mockSupabase.from).toHaveBeenCalledWith('voting_config')
      expect(mockQuery.select).toHaveBeenCalledWith('voting_start_date, max_votes_per_user')
      expect(mockQuery.order).toHaveBeenCalledWith('created_at', { ascending: false })
      expect(mockQuery.limit).toHaveBeenCalledWith(1)
      expect(mockQuery.single).toHaveBeenCalled()

      expect(result).toEqual({
        votingStartDate: new Date('2025-11-07'),
        maxVotesPerUser: 3
      })
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

