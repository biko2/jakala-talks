import { TalkRepository } from '../TalkRepository'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('TalkRepository (Supabase)', () => {
  const talkRow = {
    id: 'talk-1',
    title: 'Charla 1',
    description: 'Descripción 1',
    author: 'Autor 1',
    duration: 30,
    created_at: '2026-09-01T00:00:00Z',
    updated_at: '2026-09-01T00:00:00Z'
  }

  const talkRow2 = {
    id: 'talk-2',
    title: 'Charla 2',
    description: 'Descripción 2',
    author: 'Autor 2',
    duration: 45,
    created_at: '2026-09-02T00:00:00Z',
    updated_at: '2026-09-02T00:00:00Z'
  }

  let talksQuery: {
    select: jest.Mock
    order: jest.Mock
    eq: jest.Mock
    single: jest.Mock
  }
  let mockSupabase: { from: jest.Mock; rpc: jest.Mock }
  let repository: TalkRepository

  beforeEach(() => {
    talksQuery = {
      select: jest.fn().mockReturnThis(),
      order: jest.fn(),
      eq: jest.fn().mockReturnThis(),
      single: jest.fn()
    }

    mockSupabase = {
      from: jest.fn().mockReturnValue(talksQuery),
      rpc: jest.fn()
    }

    repository = new TalkRepository(mockSupabase as unknown as SupabaseClient)
  })

  it('debería obtener el recuento global de votos vía get_talk_vote_counts', async () => {
    talksQuery.order.mockResolvedValue({
      data: [talkRow, talkRow2],
      error: null
    })
    mockSupabase.rpc.mockResolvedValue({
      data: [
        { talk_id: 'talk-1', votes: 3 },
        { talk_id: 'talk-2', votes: 1 }
      ],
      error: null
    })

    const talks = await repository.findAll()

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_talk_vote_counts')
    expect(mockSupabase.from).toHaveBeenCalledWith('talks')
    expect(talks).toHaveLength(2)
    expect(talks.find(t => t.id === 'talk-1')?.votes).toBe(3)
    expect(talks.find(t => t.id === 'talk-2')?.votes).toBe(1)
  })

  it('debería usar 0 votos si la charla no aparece en el recuento', async () => {
    talksQuery.order.mockResolvedValue({
      data: [talkRow],
      error: null
    })
    mockSupabase.rpc.mockResolvedValue({
      data: [],
      error: null
    })

    const talks = await repository.findAll()

    expect(talks[0].votes).toBe(0)
  })

  it('debería mapear votos al buscar una charla por id', async () => {
    talksQuery.single.mockResolvedValue({
      data: talkRow,
      error: null
    })
    mockSupabase.rpc.mockResolvedValue({
      data: [{ talk_id: 'talk-1', votes: 5 }],
      error: null
    })

    const talk = await repository.findById('talk-1')

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_talk_vote_counts')
    expect(talk?.votes).toBe(5)
  })

  it('debería lanzar error si falla get_talk_vote_counts', async () => {
    talksQuery.order.mockResolvedValue({
      data: [talkRow],
      error: null
    })
    mockSupabase.rpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied' }
    })

    await expect(repository.findAll())
      .rejects.toThrow('Error al obtener votos: permission denied')
  })
})
