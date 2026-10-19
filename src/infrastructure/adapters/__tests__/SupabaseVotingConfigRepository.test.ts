/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { http } from 'msw'
import { SupabaseVotingConfigRepository } from '../SupabaseVotingConfigRepository'
import { server } from '@/lib/mock/msw/node'
import { db, resetDb } from '@/lib/mock/msw/db'
import { restUrl, postgrestError } from '@/lib/mock/msw/handlers'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'

const createRepository = () =>
  new SupabaseVotingConfigRepository(
    createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, { auth: { persistSession: false } })
  )

describe('SupabaseVotingConfigRepository (contrato HTTP con MSW)', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    resetDb()
  })
  afterAll(() => server.close())

  describe('getVotingConfig', () => {
    it('debería mapear la configuración almacenada a fechas y cupo', async () => {
      expect(await createRepository().getVotingConfig()).toEqual({
        votingStartDate: new Date('2026-09-04T00:00:00.000Z'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2026-06-29T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z'),
      })
    })

    it('debería mapear closing_date nulo a closingDate null', async () => {
      db.voting_config[0].closing_date = null

      expect((await createRepository().getVotingConfig()).closingDate).toBeNull()
    })

    it('debería lanzar el error de PostgREST de .single() cuando no hay configuración', async () => {
      db.voting_config.length = 0

      await expect(createRepository().getVotingConfig()).rejects.toThrow(
        'Error al obtener configuración de votación: Cannot coerce the result to a single JSON object'
      )
    })

    it('debería lanzar error de negocio si PostgREST responde con error', async () => {
      server.use(
        http.get(restUrl('voting_config'), () =>
          postgrestError(500, 'XX000', 'fallo interno de la base de datos')
        )
      )

      await expect(createRepository().getVotingConfig()).rejects.toThrow(
        'Error al obtener configuración de votación: fallo interno de la base de datos'
      )
    })
  })
})
