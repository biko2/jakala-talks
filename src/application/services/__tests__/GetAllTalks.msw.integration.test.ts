/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { GetAllTalks } from '../GetAllTalks'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { server } from '@/lib/mock/msw/node'
import { resetDb } from '@/lib/mock/msw/db'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'

describe('Integración MSW - Listado de charlas', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    resetDb()
  })
  afterAll(() => server.close())

  const createGetAllTalks = () => {
    const supabase = createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
    return new GetAllTalks(new TalkRepository(supabase))
  }

  it('debería devolver las charlas semilla de la más reciente a la más antigua', async () => {
    const talks = await createGetAllTalks().execute()

    expect(talks.map(talk => talk.id)).toEqual(['mock-talk-1', 'mock-talk-2', 'mock-talk-3'])
    expect(talks[0]).toMatchObject({
      title: 'Introducción a la Arquitectura Hexagonal',
      author: 'Usuario Mock',
      duration: 30,
    })
  })

  it('debería devolver el recuento de votos derivado de los votos semilla', async () => {
    const talks = await createGetAllTalks().execute()

    expect(talks.map(talk => [talk.id, talk.votes])).toEqual([
      ['mock-talk-1', 12],
      ['mock-talk-2', 5],
      ['mock-talk-3', 25],
    ])
  })
})
