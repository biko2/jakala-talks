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
      'JSON object requested, multiple (or no) rows returned',
      `The result contains ${rows.length} rows`
    )
  }
  return HttpResponse.json(rows[0], { status })
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
    const table = String(params.table)
    if (!isTable(table)) {
      return postgrestError(404, 'PGRST205', `Could not find the table 'public.${table}' in the schema cache`)
    }
    const url = new URL(request.url)
    const filtered = applyFilters(db[table] as unknown as Row[], url.searchParams)
    if (filtered instanceof Response) return filtered
    const ordered = applyOrder(filtered, url.searchParams.get('order'))
    const limited = applyLimit(ordered, url.searchParams.get('limit'))
    return respondRows(request, applySelect(limited, url.searchParams.get('select')))
  }),

  http.post(restUrl('rpc/get_talk_vote_counts'), () => HttpResponse.json(voteCounts())),
]
