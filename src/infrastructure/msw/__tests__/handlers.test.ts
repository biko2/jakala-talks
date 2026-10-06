/**
 * @jest-environment node
 */
import { setupServer } from 'msw/node'
import { createHandlers } from '../handlers'
import { createStore } from '../store'

const BASE = 'https://test.supabase.co'

describe('MSW handlers', () => {
  const server = setupServer()

  beforeAll(() => {
    server.listen({ onUnhandledRequest: 'error' })
  })

  beforeEach(() => {
    server.resetHandlers(...createHandlers(createStore()))
  })

  afterAll(() => {
    server.close()
  })

  it('GET talks devuelve el snapshot ordenado por created_at desc', async () => {
    const response = await fetch(`${BASE}/rest/v1/talks?select=*&order=created_at.desc`)
    const talks = await response.json() as Array<{ id: string; title: string; author: string }>

    expect(response.ok).toBe(true)
    expect(talks).toHaveLength(16)
    expect(talks[0]).toEqual(
      expect.objectContaining({
        id: 'ef9764b5-ca64-4b2c-b0c0-c08f309be4ef',
        title: 'Urbanismo verde y tecnología',
        author: 'Javier Rubio',
      })
    )
    expect(talks.some((talk) => talk.id === '9ff59505-b90c-4888-8424-b4b406a8ae47' && talk.title === 'Diseño en tiempos de IA')).toBe(true)
  })

  it('RPC get_talk_vote_counts devuelve recuentos del snapshot', async () => {
    const response = await fetch(`${BASE}/rest/v1/rpc/get_talk_vote_counts`, { method: 'POST' })
    const counts = await response.json() as Array<{ talk_id: string; votes: number }>

    expect(response.ok).toBe(true)
    expect(counts).toEqual(
      expect.arrayContaining([
        { talk_id: '8ae91b7a-696e-4285-ac9e-50de609bbe80', votes: 24 },
        { talk_id: '6b73d2ed-48d8-418d-9c7b-6183fa47281f', votes: 24 },
        { talk_id: '7dee1fa8-d51f-4362-a952-36554bee294a', votes: 20 },
        { talk_id: 'd601b443-8f50-4e7d-b396-e0a4a4105e65', votes: 1 },
      ])
    )
  })

  it('GET voting_config devuelve la fila conocida del snapshot', async () => {
    const response = await fetch(
      `${BASE}/rest/v1/voting_config?select=voting_start_date,max_votes_per_user,proposing_talks_start_date,closing_date&order=created_at.desc&limit=1`
    )
    const config = await response.json() as {
      id: string
      max_votes_per_user: number
      voting_start_date: string
      proposing_talks_start_date: string
      closing_date: string
    }

    expect(response.ok).toBe(true)
    expect(config).toEqual(
      expect.objectContaining({
        id: 'd384f2ca-9b7f-4d5b-9fc9-7539f8be1c50',
        max_votes_per_user: 3,
        voting_start_date: '2026-09-03T00:00:00+00:00',
        proposing_talks_start_date: '2026-06-29',
        closing_date: '2026-09-08',
      })
    )
  })

  it('GET auth user devuelve la sesión mock fija', async () => {
    const response = await fetch(`${BASE}/auth/v1/user`)
    const user = await response.json() as { id: string; email: string; user_metadata: { full_name: string } }

    expect(response.ok).toBe(true)
    expect(user.id).toBe('11111111-1111-4111-8111-111111111111')
    expect(user.email).toBe('usuario.mock@jakala.com')
    expect(user.user_metadata.full_name).toBe('Usuario Mock')
  })
})
