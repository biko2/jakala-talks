/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { GetUserVotes } from '../GetUserVotes'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { server } from '@/lib/mock/msw/node'
import { resetDb } from '@/lib/mock/msw/db'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'
import { MOCK_USER } from '@/lib/mock/user'

describe('Integración MSW - Votos del usuario', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  afterEach(() => {
    server.resetHandlers()
    resetDb()
  })
  afterAll(() => server.close())

  const createGetUserVotes = () => {
    const supabase = createClient(MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY, {
      auth: { persistSession: false },
    })
    return new GetUserVotes(new TalkRepository(supabase))
  }

  it('debería devolver los votos semilla del usuario mock', async () => {
    const votes = await createGetUserVotes().execute(MOCK_USER.id)

    expect(votes).toEqual(['mock-talk-1'])
  })

  it('debería devolver una lista vacía para un usuario sin votos', async () => {
    const votes = await createGetUserVotes().execute('usuario-sin-votos')

    expect(votes).toEqual([])
  })
})
