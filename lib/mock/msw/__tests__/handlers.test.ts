/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { VotingRules } from '@/src/domain/valueObjects/VotingRules'
import { server } from '../node'
import { db, resetDb } from '../db'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '../constants'

const createSupabase = () =>
  createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, { auth: { persistSession: false } })

describe('Handlers MSW de lectura', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    resetDb()
    jest.useRealTimers()
  })
  afterAll(() => server.close())

  describe('detalle de charla', () => {
    it('debería devolver la charla semilla con su recuento de votos', async () => {
      const talk = await new TalkRepository(createSupabase()).findById('mock-talk-3')

      expect(talk).toMatchObject({ id: 'mock-talk-3', title: 'TypeScript Avanzado', votes: 25 })
    })

    it('debería devolver null cuando la charla no existe (PGRST116)', async () => {
      const talk = await new TalkRepository(createSupabase()).findById('no-existe')

      expect(talk).toBeNull()
    })

    it('debería responder 406 con código PGRST116 al pedir un objeto inexistente', async () => {
      const { error, status } = await createSupabase()
        .from('talks')
        .select('*')
        .eq('id', 'no-existe')
        .single()

      expect(status).toBe(406)
      expect(error?.code).toBe('PGRST116')
    })
  })

  describe('configuración de votación', () => {
    it('debería devolver la configuración semilla con las fechas fijas', async () => {
      const config = await new SupabaseVotingConfigRepository(createSupabase()).getVotingConfig()

      expect(config).toEqual({
        votingStartDate: new Date('2026-09-04T00:00:00.000Z'),
        maxVotesPerUser: 3,
        proposingStartDate: new Date('2026-06-29T00:00:00.000Z'),
        closingDate: new Date('2026-09-08T00:00:00.000Z'),
      })
    })

    it('debería devolver el registro más reciente si hay varios', async () => {
      db.voting_config.push({
        id: 'config-nueva',
        voting_start_date: '2027-01-10T00:00:00.000Z',
        max_votes_per_user: 5,
        proposing_talks_start_date: '2027-01-01T00:00:00.000Z',
        closing_date: null,
        created_at: '2027-01-01T00:00:00.000Z',
      })

      const config = await new SupabaseVotingConfigRepository(createSupabase()).getVotingConfig()

      expect(config.maxVotesPerUser).toBe(5)
      expect(config.closingDate).toBeNull()
    })

    it('debería permitir calcular la fase de votación con el adaptador real', async () => {
      jest.useFakeTimers({
        now: new Date('2026-09-05T12:00:00.000Z'),
        doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'],
      })
      const rules = new VotingRules(new SupabaseVotingConfigRepository(createSupabase()))

      expect(await rules.getVotingStatus()).toBe('voting')
    })
  })

  describe('reset', () => {
    it('debería volver a la semilla tras mutar la base', async () => {
      db.user_votes.length = 0
      db.talks.length = 0

      resetDb()
      const talks = await new TalkRepository(createSupabase()).findAll()

      expect(talks.map(talk => [talk.id, talk.votes])).toEqual([
        ['mock-talk-1', 12],
        ['mock-talk-2', 5],
        ['mock-talk-3', 25],
      ])
    })
  })
})
