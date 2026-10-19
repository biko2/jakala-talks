import { VotingConfigRepositoryFactory } from '../VotingConfigRepositoryFactory'
import { createBrowserClient } from '@/lib/supabase/client'
import { SupabaseVotingConfigRepository } from '@/src/infrastructure/adapters/SupabaseVotingConfigRepository'

jest.mock('@/lib/supabase/client')
jest.mock('@/src/infrastructure/adapters/SupabaseVotingConfigRepository')

const mockCreateBrowserClient = createBrowserClient as jest.MockedFunction<typeof createBrowserClient>

describe('VotingConfigRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('debería crear el adaptador Supabase real con el cliente de navegador', () => {
    const browserClient = { from: jest.fn() }
    mockCreateBrowserClient.mockReturnValue(browserClient as unknown as ReturnType<typeof createBrowserClient>)

    const repository = VotingConfigRepositoryFactory.create()

    expect(SupabaseVotingConfigRepository).toHaveBeenCalledWith(browserClient)
    expect(repository).toBeInstanceOf(SupabaseVotingConfigRepository)
  })
})
