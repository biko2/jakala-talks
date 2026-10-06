import { TalkRepositoryFactory } from '../TalkRepositoryFactory'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'

jest.mock('@/lib/supabase/client', () => ({
  createBrowserClient: jest.fn(() => ({ from: jest.fn() })),
}))

describe('TalkRepositoryFactory', () => {
  describe('create', () => {
    it('debería devolver TalkRepository (adaptador Supabase)', () => {
      const repository = TalkRepositoryFactory.create()

      expect(repository).toBeInstanceOf(TalkRepository)
    })

    it('debería devolver TalkRepository aunque USE_MOCK_USER esté activo', () => {
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'

      const repository = TalkRepositoryFactory.create()

      expect(repository).toBeInstanceOf(TalkRepository)
    })
  })

  describe('createForTesting', () => {
    it('debería devolver InMemoryTalkRepository', () => {
      const repository = TalkRepositoryFactory.createForTesting()

      expect(repository).toBeInstanceOf(InMemoryTalkRepository)
    })
  })
})
