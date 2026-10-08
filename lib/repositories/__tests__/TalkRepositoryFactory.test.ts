import { TalkRepositoryFactory } from '../TalkRepositoryFactory'
import { createBrowserClient } from '@/lib/supabase/client'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'

jest.mock('@/lib/supabase/client')
jest.mock('@/src/infrastructure/adapters/TalkRepository')
jest.mock('@/src/infrastructure/adapters/InMemoryTalkRepository')

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('TalkRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('debería crear TalkRepository con el cliente de Supabase', () => {
      const mockSupabaseClient = { from: jest.fn() }
      mockCreateBrowserClient.mockReturnValue(mockSupabaseClient as unknown as ReturnType<typeof createBrowserClient>)

      TalkRepositoryFactory.create()

      expect(mockCreateBrowserClient).toHaveBeenCalled()
      expect(TalkRepository).toHaveBeenCalledWith(mockSupabaseClient)
    })
  })

  describe('createForTesting', () => {
    it('debería crear InMemoryTalkRepository para testing', () => {
      TalkRepositoryFactory.createForTesting()

      expect(InMemoryTalkRepository).toHaveBeenCalled()
    })
  })
})
