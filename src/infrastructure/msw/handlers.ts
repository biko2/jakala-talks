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

    http.post('*/rest/v1/rpc/get_talk_vote_counts', () => {
      return HttpResponse.json(countVotes(store))
    }),

    http.get('*/rest/v1/voting_config', () => {
      return HttpResponse.json(store.votingConfig)
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

    http.get('*/auth/v1/user', () => {
      return HttpResponse.json(MOCK_SESSION_USER)
    }),

    http.get('*/auth/v1/session', () => {
      return HttpResponse.json(createMockSession())
    }),
  ]
}

export const handlers = createHandlers()
