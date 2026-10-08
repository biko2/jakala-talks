/**
 * @jest-environment node
 */
import { setupServer } from 'msw/node'
import { handlers } from '../handlers'
import { getStore, resetStore } from '../store'

const SUPABASE_URL = 'https://test.supabase.co'

const server = setupServer(...handlers)

describe('MSW handlers (contrato HTTP)', () => {
  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  afterEach(() => {
    server.resetHandlers()
    resetStore()
  })

  afterAll(() => {
    server.close()
  })

  it('GET talks devuelve las 16 charlas del snapshot, más recientes primero', async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/talks?select=*&order=created_at.desc`)
    const talks = await response.json() as Array<{ id: string; title: string }>

    expect(response.ok).toBe(true)
    expect(talks).toHaveLength(16)
    expect(talks[0]).toMatchObject({
      id: 'ef9764b5-ca64-4b2c-b0c0-c08f309be4ef',
      title: 'Urbanismo verde y tecnología'
    })
    expect(talks[15]).toMatchObject({
      id: '9ff59505-b90c-4888-8424-b4b406a8ae47',
      title: 'Diseño en tiempos de IA'
    })
  })

  it('RPC get_talk_vote_counts deriva el recuento desde user_votes', async () => {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/get_talk_vote_counts`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}'
    })
    const counts = await response.json() as Array<{ talk_id: string; votes: number }>

    expect(response.ok).toBe(true)
    expect(counts.find(row => row.talk_id === '6b73d2ed-48d8-418d-9c7b-6183fa47281f')?.votes).toBe(24)
    expect(counts.find(row => row.talk_id === 'd601b443-8f50-4e7d-b396-e0a4a4105e65')?.votes).toBe(1)
  })

  it('GET voting_config devuelve la fila del snapshot como objeto', async () => {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/voting_config?select=voting_start_date,max_votes_per_user,proposing_talks_start_date,closing_date&order=created_at.desc&limit=1`,
      { headers: { Accept: 'application/vnd.pgrst.object+json' } }
    )
    const config = await response.json() as {
      max_votes_per_user: number
      voting_start_date: string
      proposing_talks_start_date: string
      closing_date: string
    }

    expect(response.ok).toBe(true)
    expect(config.max_votes_per_user).toBe(3)
    expect(config.voting_start_date).toBe('2026-09-03T00:00:00+00:00')
    expect(config.proposing_talks_start_date).toBe('2026-06-29')
    expect(config.closing_date).toBe('2026-09-08')
  })

  it('GET /auth/v1/user devuelve el usuario mock autenticado', async () => {
    const response = await fetch(`${SUPABASE_URL}/auth/v1/user`)
    const user = await response.json() as { id: string; email: string; aud: string }

    expect(response.ok).toBe(true)
    expect(user.id).toBe('mock-user-123')
    expect(user.email).toBe('usuario.mock@jakala.com')
    expect(user.aud).toBe('authenticated')
  })

  it('resetStore restaura el fixture tras mutar el store en memoria', async () => {
    getStore().talks.pop()

    const mutated = await fetch(`${SUPABASE_URL}/rest/v1/talks?select=*`)
    expect(await mutated.json()).toHaveLength(15)

    resetStore()

    const restored = await fetch(`${SUPABASE_URL}/rest/v1/talks?select=*`)
    expect(await restored.json()).toHaveLength(16)
  })
})
