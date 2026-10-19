import { http, HttpResponse } from 'msw'
import { MOCK_SUPABASE_URL } from './constants'
import { db, type TableName } from './db'

type Row = Record<string, unknown>

const PGRST_OBJECT_MEDIA_TYPE = 'application/vnd.pgrst.object+json'
const RESERVED_PARAMS = new Set(['select', 'order', 'limit', 'offset'])

export const restUrl = (path: string) => `${MOCK_SUPABASE_URL}/rest/v1/${path}`

export function postgrestError(status: number, code: string, message: string, details: string | null = null) {
  return HttpResponse.json({ code, details, hint: null, message }, { status })
}

function isTable(name: string): name is TableName {
  return Object.prototype.hasOwnProperty.call(db, name)
}

function resolveTable(params: Record<string, unknown>): TableName | Response {
  const table = String(params.table)
  if (!isTable(table)) {
    return postgrestError(404, 'PGRST205', `Could not find the table 'public.${table}' in the schema cache`)
  }
  return table
}

export function applyFilters(rows: Row[], params: URLSearchParams): Row[] | Response {
  let result = rows
  for (const [column, expression] of params) {
    if (RESERVED_PARAMS.has(column)) continue
    if (!expression.startsWith('eq.')) {
      return postgrestError(400, 'PGRST100', `Filtro no soportado por el mock: ${column}=${expression}`)
    }
    const value = expression.slice('eq.'.length)
    result = result.filter(row => String(row[column]) === value)
  }
  return result
}

function applyOrder(rows: Row[], order: string | null): Row[] {
  if (!order) return rows
  const clauses = order.split(',').map(clause => {
    const [column, direction] = clause.split('.')
    return { column, descending: direction === 'desc' }
  })
  return [...rows].sort((a, b) => {
    for (const { column, descending } of clauses) {
      const left = String(a[column])
      const right = String(b[column])
      if (left === right) continue
      const comparison = left < right ? -1 : 1
      return descending ? -comparison : comparison
    }
    return 0
  })
}

function applyLimit(rows: Row[], limit: string | null): Row[] {
  return limit === null ? rows : rows.slice(0, Number(limit))
}

function applySelect(rows: Row[], select: string | null): Row[] {
  if (!select || select === '*') return rows
  const columns = select.split(',')
  return rows.map(row => Object.fromEntries(columns.map(column => [column, row[column]])))
}

export function respondRows(request: Request, rows: Row[], status = 200) {
  const wantsObject = request.headers.get('Accept')?.includes(PGRST_OBJECT_MEDIA_TYPE)
  if (!wantsObject) {
    return HttpResponse.json(rows, { status })
  }
  if (rows.length !== 1) {
    return postgrestError(
      406,
      'PGRST116',
      'Cannot coerce the result to a single JSON object',
      `The result contains ${rows.length} rows`
    )
  }
  return HttpResponse.json(rows[0], { status })
}

function withColumnDefaults(table: TableName, row: Row): Row {
  const now = new Date().toISOString()
  const defaults: Row = { id: crypto.randomUUID(), created_at: now }
  if (table === 'talks') defaults.updated_at = now
  return { ...defaults, ...row }
}

function findDuplicateVote(rows: Row[]): Row | undefined {
  const isSameVote = (a: Row, b: Row) => a.user_id === b.user_id && a.talk_id === b.talk_id
  return rows.find((row, index) =>
    db.user_votes.some(vote => isSameVote(vote as unknown as Row, row)) ||
    rows.slice(0, index).some(previous => isSameVote(previous, row))
  )
}

function voteCounts() {
  const counts = new Map<string, number>()
  for (const vote of db.user_votes) {
    counts.set(vote.talk_id, (counts.get(vote.talk_id) ?? 0) + 1)
  }
  return Array.from(counts, ([talk_id, votes]) => ({ talk_id, votes }))
}

export const handlers = [
  http.get(restUrl(':table'), ({ request, params }) => {
    const table = resolveTable(params)
    if (table instanceof Response) return table
    const url = new URL(request.url)
    const filtered = applyFilters(db[table] as unknown as Row[], url.searchParams)
    if (filtered instanceof Response) return filtered
    const ordered = applyOrder(filtered, url.searchParams.get('order'))
    const limited = applyLimit(ordered, url.searchParams.get('limit'))
    return respondRows(request, applySelect(limited, url.searchParams.get('select')))
  }),

  http.post(restUrl('rpc/get_talk_vote_counts'), () => HttpResponse.json(voteCounts())),

  http.post(restUrl(':table'), async ({ request, params }) => {
    const table = resolveTable(params)
    if (table instanceof Response) return table
    const body = (await request.json()) as Row | Row[]
    const rows = (Array.isArray(body) ? body : [body]).map(row => withColumnDefaults(table, row))
    const duplicate = table === 'user_votes' ? findDuplicateVote(rows) : undefined
    if (duplicate) {
      return postgrestError(
        409,
        '23505',
        'duplicate key value violates unique constraint "user_votes_user_id_talk_id_key"',
        `Key (user_id, talk_id)=(${duplicate.user_id}, ${duplicate.talk_id}) already exists.`
      )
    }
    ;(db[table] as unknown as Row[]).push(...rows)
    return new HttpResponse(null, { status: 201 })
  }),

  http.delete(restUrl(':table'), ({ request, params }) => {
    const table = resolveTable(params)
    if (table instanceof Response) return table
    const rows = db[table] as unknown as Row[]
    const matched = applyFilters(rows, new URL(request.url).searchParams)
    if (matched instanceof Response) return matched
    const remaining = rows.filter(row => !matched.includes(row))
    rows.splice(0, rows.length, ...remaining)
    return new HttpResponse(null, { status: 204 })
  }),
]
