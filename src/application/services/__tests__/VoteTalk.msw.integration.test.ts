/**
 * @jest-environment node
 */
import { createClient } from '@supabase/supabase-js'
import { VoteTalk } from '../VoteTalk'
import { GetUserVotes } from '../GetUserVotes'
import { GetAllTalks } from '../GetAllTalks'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'
import { server } from '@/lib/mock/msw/node'
import { db, resetDb } from '@/lib/mock/msw/db'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'
import { MOCK_USER } from '@/lib/mock/user'

const VOTING_PHASE_NOW = new Date('2026-09-05T12:00:00.000Z')

describe('Integración MSW - Votar y desvotar charlas', () => {
  beforeAll(() => server.listen({ onUnhandledRequest: 'error' }))
  beforeEach(() => {
    jest.useFakeTimers({
      now: VOTING_PHASE_NOW,
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
      voteTalk: new VoteTalk(talkRepository, new SupabaseVotingConfigRepository(supabase)),
      getUserVotes: new GetUserVotes(talkRepository),
      getAllTalks: new GetAllTalks(talkRepository),
    }
  }

  const voteCountsById = async (getAllTalks: GetAllTalks) =>
    Object.fromEntries((await getAllTalks.execute()).map(talk => [talk.id, talk.votes]))

  it('debería sumar el voto al recuento y a los votos del usuario', async () => {
    const { voteTalk, getUserVotes, getAllTalks } = createUseCases()

    await voteTalk.execute(MOCK_USER.id, 'mock-talk-2')

    expect(await getUserVotes.execute(MOCK_USER.id)).toEqual(['mock-talk-1', 'mock-talk-2'])
    expect(await voteCountsById(getAllTalks)).toEqual({ 'mock-talk-1': 12, 'mock-talk-2': 6, 'mock-talk-3': 25 })
  })

  it('debería desvotar una charla ya votada y restar su recuento', async () => {
    const { voteTalk, getUserVotes, getAllTalks } = createUseCases()

    await voteTalk.execute(MOCK_USER.id, 'mock-talk-1')

    expect(await getUserVotes.execute(MOCK_USER.id)).toEqual([])
    expect(await voteCountsById(getAllTalks)).toEqual({ 'mock-talk-1': 11, 'mock-talk-2': 5, 'mock-talk-3': 25 })
  })

  it('debería alternar votar y desvotar sin tocar los votos de otros usuarios', async () => {
    const { voteTalk, getUserVotes, getAllTalks } = createUseCases()

    await voteTalk.execute(MOCK_USER.id, 'mock-talk-3')
    await voteTalk.execute(MOCK_USER.id, 'mock-talk-3')

    expect(await getUserVotes.execute(MOCK_USER.id)).toEqual(['mock-talk-1'])
    expect(await getUserVotes.execute('seed-user-1')).toEqual(['mock-talk-1', 'mock-talk-2', 'mock-talk-3'])
    expect(await voteCountsById(getAllTalks)).toEqual({ 'mock-talk-1': 12, 'mock-talk-2': 5, 'mock-talk-3': 25 })
  })

  it('debería rechazar superar el máximo de votos sin registrar el voto', async () => {
    db.talks.push({
      id: 'talk-extra',
      title: 'Charla extra',
      description: 'Descripción extra',
      author: 'Ana',
      duration: 30,
      created_at: '2026-07-01T00:00:00.000Z',
      updated_at: '2026-07-01T00:00:00.000Z',
    })
    const { voteTalk, getUserVotes, getAllTalks } = createUseCases()
    await voteTalk.execute(MOCK_USER.id, 'mock-talk-2')
    await voteTalk.execute(MOCK_USER.id, 'mock-talk-3')

    await expect(voteTalk.execute(MOCK_USER.id, 'talk-extra'))
      .rejects.toThrow('Solo puedes votar un máximo de 3 charlas')

    expect(await getUserVotes.execute(MOCK_USER.id)).toEqual(['mock-talk-1', 'mock-talk-2', 'mock-talk-3'])
    expect((await voteCountsById(getAllTalks))['talk-extra']).toBe(0)
  })

  it('debería rechazar votar fuera de la fase de votación', async () => {
    jest.setSystemTime(new Date('2026-09-08T00:00:00.000Z'))
    const { voteTalk, getUserVotes } = createUseCases()

    await expect(voteTalk.execute(MOCK_USER.id, 'mock-talk-2')).rejects.toThrow('La votación ha finalizado')

    expect(await getUserVotes.execute(MOCK_USER.id)).toEqual(['mock-talk-1'])
  })
})
