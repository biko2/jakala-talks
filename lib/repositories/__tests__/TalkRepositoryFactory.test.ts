import { TalkRepositoryFactory } from '../TalkRepositoryFactory'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { createBrowserClient } from '@/lib/supabase/client'

jest.mock('@/src/infrastructure/adapters/TalkRepository')
jest.mock('@/lib/supabase/client')

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('TalkRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería crear el adaptador Supabase real con el cliente de navegador', () => {
    const browserClient = { from: jest.fn() }
    mockCreateBrowserClient.mockReturnValue(browserClient as unknown as ReturnType<typeof createBrowserClient>)

    const repository = TalkRepositoryFactory.create()

    expect(TalkRepository).toHaveBeenCalledWith(browserClient)
    expect(repository).toBeInstanceOf(TalkRepository)
  })
})
