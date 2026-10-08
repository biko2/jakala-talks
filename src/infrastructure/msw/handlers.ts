import { http, HttpResponse } from 'msw'
import { getStore } from './store'
import { createMockSession, MSW_AUTH_USER } from './authUser'

type JsonRow = Record<string, unknown>

function jsonHeaders(extra?: HeadersInit): Headers {
  return new Headers({
    'Content-Type': 'application/json; charset=utf-8',
    ...extra
  })
}

function applySelect(rows: JsonRow[], select: string | null): JsonRow[] {
  if (!select || select === '*') {
    return rows
  }

  const columns = select.split(',').map(column => column.trim())
  return rows.map(row =>
    Object.fromEntries(columns.map(column => [column, row[column]]))
  )
}

function applyOrder(rows: JsonRow[], order: string | null): JsonRow[] {
  if (!order) {
    return rows
  }

  const [column, direction] = order.split('.')
  const descending = direction === 'desc'
  return [...rows].sort((left, right) => {
    const a = String(left[column] ?? '')
    const b = String(right[column] ?? '')
    if (a === b) return 0
    const compared = a < b ? -1 : 1
    return descending ? -compared : compared
  })
}

function applyEqFilters(rows: JsonRow[], requestUrl: URL): JsonRow[] {
  let filtered = rows

  for (const [key, value] of requestUrl.searchParams.entries()) {
    if (key === 'select' || key === 'order' || key === 'limit' || key === 'offset') {
      continue
    }
    if (value.startsWith('eq.')) {
      const expected = value.slice(3)
      filtered = filtered.filter(row => String(row[key]) === expected)
    }
  }

  return filtered
}

function applyFilters(rows: JsonRow[], requestUrl: URL): JsonRow[] {
  let filtered = applyEqFilters(rows, requestUrl)

  const limit = requestUrl.searchParams.get('limit')
  if (limit) {
    filtered = filtered.slice(0, Number(limit))
  }

  return filtered
}

function postgrestResponse(request: Request, rows: JsonRow[]): Response {
  const url = new URL(request.url)
  const selected = applySelect(applyOrder(applyFilters(rows, url), url.searchParams.get('order')), url.searchParams.get('select'))
  const wantsObject = request.headers.get('Accept')?.includes('application/vnd.pgrst.object+json')

  if (wantsObject) {
    if (selected.length === 0) {
      return HttpResponse.json(
        { message: 'JSON object requested, multiple (or no) rows returned', code: 'PGRST116' },
        { status: 406, headers: jsonHeaders() }
      )
    }
    return HttpResponse.json(selected[0], { headers: jsonHeaders() })
  }

  return HttpResponse.json(selected, { headers: jsonHeaders() })
}

function voteCounts() {
  const counts = new Map<string, number>()
  for (const vote of getStore().user_votes) {
    counts.set(vote.talk_id, (counts.get(vote.talk_id) ?? 0) + 1)
  }
  return Array.from(counts.entries()).map(([talk_id, votes]) => ({ talk_id, votes }))
}

async function insertTalks(request: Request): Promise<Response> {
  const body = await request.json()
  const rows = (Array.isArray(body) ? body : [body]) as JsonRow[]
  const now = new Date().toISOString()
  const store = getStore()

  for (const row of rows) {
    store.talks.push({
      id: String(row.id ?? crypto.randomUUID()),
      title: String(row.title ?? ''),
      description: String(row.description ?? ''),
      author: String(row.author ?? ''),
      duration: Number(row.duration ?? 0),
      created_at: String(row.created_at ?? now),
      updated_at: String(row.updated_at ?? now)
    })
  }

  return new HttpResponse(null, { status: 201, headers: jsonHeaders() })
}

async function insertUserVotes(request: Request): Promise<Response> {
  const body = await request.json()
  const rows = (Array.isArray(body) ? body : [body]) as JsonRow[]
  const now = new Date().toISOString()
  const store = getStore()

  for (const row of rows) {
    store.user_votes.push({
      id: String(row.id ?? crypto.randomUUID()),
      user_id: String(row.user_id ?? ''),
      talk_id: String(row.talk_id ?? ''),
      created_at: String(row.created_at ?? now)
    })
  }

  return new HttpResponse(null, { status: 201, headers: jsonHeaders() })
}

export const handlers = [
  http.get('*/rest/v1/talks', ({ request }) => {
    return postgrestResponse(request, getStore().talks as JsonRow[])
  }),

  http.post('*/rest/v1/talks', ({ request }) => insertTalks(request)),

  http.get('*/rest/v1/voting_config', ({ request }) => {
    return postgrestResponse(request, getStore().voting_config as JsonRow[])
  }),

  http.get('*/rest/v1/user_votes', ({ request }) => {
    return postgrestResponse(request, getStore().user_votes as JsonRow[])
  }),

  http.post('*/rest/v1/user_votes', ({ request }) => insertUserVotes(request)),

  http.delete('*/rest/v1/user_votes', ({ request }) => {
    const url = new URL(request.url)
    const store = getStore()
    const matching = applyEqFilters(store.user_votes as JsonRow[], url)
    store.user_votes = store.user_votes.filter(row => !matching.includes(row as JsonRow))
    return new HttpResponse(null, { status: 204, headers: jsonHeaders() })
  }),

  http.post('*/rest/v1/rpc/get_talk_vote_counts', () => {
    return HttpResponse.json(voteCounts(), { headers: jsonHeaders() })
  }),

  http.get('*/auth/v1/user', () => {
    return HttpResponse.json(MSW_AUTH_USER, { headers: jsonHeaders() })
  }),

  http.post('*/auth/v1/token', () => {
    return HttpResponse.json(createMockSession(), { headers: jsonHeaders() })
  })
]
