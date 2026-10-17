/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { CreateTalk } from '../CreateTalk'
import { GetAllTalks } from '../GetAllTalks'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { server } from '@/lib/mock/msw/node'
import { resetDb } from '@/lib/mock/msw/db'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'

const PROPOSING_PHASE_NOW = new Date('2026-07-15T10:00:00.000Z')

describe('Integración MSW - Crear charla', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(() => {
    jest.useFakeTimers({
      now: PROPOSING_PHASE_NOW,
      doNotFake: ['nextTick', 'setImmediate', 'setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'queueMicrotask'],
    })
  })
  afterEach(() => {
    server.resetHandlers()
    resetDb()
    jest.useRealTimers()
  })
  afterAll(() => server.close())

  const createUseCases = () => {
    const supabase = createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
    const talkRepository = new TalkRepository(supabase)
    return {
      createTalk: new CreateTalk(talkRepository, new SupabaseVotingConfigRepository(supabase)),
      getAllTalks: new GetAllTalks(talkRepository),
    }
  }

  it('debería mostrar la charla creada la primera del listado y sin votos', async () => {
    const { createTalk, getAllTalks } = createUseCases()

    const created = await createTalk.execute('  Charla nueva  ', 'Descripción nueva', 'Ana', 45)
    const talks = await getAllTalks.execute()

    expect(talks.map(talk => talk.id)).toEqual([created.id, 'mock-talk-1', 'mock-talk-2', 'mock-talk-3'])
    expect(talks[0]).toMatchObject({
      title: 'Charla nueva',
      description: 'Descripción nueva',
      author: 'Ana',
      duration: 45,
      votes: 0,
    })
  })

  it('debería rechazar crear charlas en fase de votación sin tocar el listado', async () => {
    jest.setSystemTime(new Date('2026-09-05T12:00:00.000Z'))
    const { createTalk, getAllTalks } = createUseCases()

    await expect(createTalk.execute('Charla tardía', 'Descripción', 'Ana', 30))
      .rejects.toThrow('No se pueden crear nuevas charlas cuando la votación está activa')

    const talks = await getAllTalks.execute()
    expect(talks.map(talk => talk.id)).toEqual(['mock-talk-1', 'mock-talk-2', 'mock-talk-3'])
  })

  it('debería volver a la semilla en el siguiente test', async () => {
    const talks = await createUseCases().getAllTalks.execute()

    expect(talks).toHaveLength(3)
  })
})
