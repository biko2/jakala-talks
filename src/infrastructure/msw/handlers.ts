import { http, HttpResponse } from 'msw'
import { MOCK_SESSION_USER, createMockSession } from './fixture/session'
import { countVotes, createStore, type MswStore } from './store'

function eqParam(url: URL, key: string): string | null {
  const value = url.searchParams.get(key)
  if (!value?.startsWith('eq.')) {
    return null
  }
  return value.slice(3)
}

async function parseInsertRows<T>(request: Request): Promise<T[]> {
  const body = await request.json() as T | T[]
  return Array.isArray(body) ? body : [body]
}

export function createHandlers(store: MswStore = createStore()) {
  return [
    http.get('*/rest/v1/talks', ({ request }) => {
      const url = new URL(request.url)
      const id = eqParam(url, 'id')
      const talks = [...store.talks].sort((a, b) => b.created_at.localeCompare(a.created_at))

      if (id) {
        const talk = talks.find((row) => row.id === id)
        if (!talk) {
          return HttpResponse.json({ message: 'JSON object requested, multiple (or no) rows returned' }, { status: 406 })
        }
        return HttpResponse.json(talk)
      }

      return HttpResponse.json(talks)
    }),

    http.post('*/rest/v1/talks', async ({ request }) => {
      const now = new Date().toISOString()
      const rows = await parseInsertRows<Partial<MswStore['talks'][number]>>(request)

      for (const row of rows) {
        store.talks.push({
          id: row.id ?? crypto.randomUUID(),
          title: row.title ?? '',
          description: row.description ?? '',
          author: row.author ?? '',
          duration: row.duration ?? 0,
          created_at: row.created_at ?? now,
          updated_at: row.updated_at ?? now,
        })
      }

      return new HttpResponse(null, { status: 201 })
    }),

    http.post('*/rest/v1/rpc/get_talk_vote_counts', () => {
      return HttpResponse.json(countVotes(store))
    }),

    http.get('*/rest/v1/voting_config', () => {
      return HttpResponse.json(store.votingConfig)
    }),

    http.post('*/rest/v1/user_votes', async ({ request }) => {
      const now = new Date().toISOString()
      const rows = await parseInsertRows<Partial<MswStore['userVotes'][number]>>(request)

      for (const row of rows) {
        store.userVotes.push({
          id: row.id ?? crypto.randomUUID(),
          user_id: row.user_id ?? '',
          talk_id: row.talk_id ?? '',
          created_at: row.created_at ?? now,
        })
      }

      return new HttpResponse(null, { status: 201 })
    }),

    http.get('*/rest/v1/user_votes', ({ request }) => {
      const url = new URL(request.url)
      const userId = eqParam(url, 'user_id')
      const talkId = eqParam(url, 'talk_id')
      let rows = store.userVotes

      if (userId) {
        rows = rows.filter((row) => row.user_id === userId)
      }
      if (talkId) {
        rows = rows.filter((row) => row.talk_id === talkId)
      }

      return HttpResponse.json(rows)
    }),

    http.delete('*/rest/v1/user_votes', ({ request }) => {
      const url = new URL(request.url)
      const userId = eqParam(url, 'user_id')
      const talkId = eqParam(url, 'talk_id')

      store.userVotes = store.userVotes.filter((row) => {
        if (userId && row.user_id !== userId) {
          return true
        }
        if (talkId && row.talk_id !== talkId) {
          return true
        }
        return false
      })

      return new HttpResponse(null, { status: 204 })
    }),

    http.get('*/auth/v1/user', () => {
      return HttpResponse.json(MOCK_SESSION_USER)
    }),

    http.get('*/auth/v1/session', () => {
      return HttpResponse.json(createMockSession())
    }),
  ]
}

export const handlers = createHandlers()
