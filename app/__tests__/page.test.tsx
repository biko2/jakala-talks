import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import Home from '../page'
import { User } from '@supabase/supabase-js'
import { Talk } from '@/src/domain/entities/Talk'

const mockUser: User = {
  id: 'user-123',
  email: 'test@example.com',
  app_metadata: {},
  user_metadata: { full_name: 'Test User' },
  aud: 'authenticated',
  created_at: new Date().toISOString()
}

const mockGetAllTalksExecute = jest.fn()
const mockVoteTalkExecute = jest.fn()
const mockGetUserVotesExecute = jest.fn()
const mockCreateTalkExecute = jest.fn()

const mockGetVotingConfig = jest.fn().mockResolvedValue({
  votingEnabled: true,
  maxVotesPerUser: 3,
  startDate: new Date('2025-11-07T00:00:00.000Z'),
  endDate: new Date('2025-11-14T23:59:59.000Z')
})

const mockCanCreateNewTalks = jest.fn().mockResolvedValue(true)
const mockIsVotingEnabled = jest.fn().mockResolvedValue(true)

jest.mock('next/navigation', () => ({
  useRouter: jest.fn(() => ({
    push: jest.fn()
  }))
}))

jest.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      getUser: jest.fn(() => Promise.resolve({ data: { user: mockUser }, error: null })),
      onAuthStateChange: jest.fn(() => ({
        data: { subscription: { unsubscribe: jest.fn() } }
      }))
    }
  })
}))

jest.mock('@/lib/mock/user', () => ({
  isMockMode: jest.fn(() => false),
  MOCK_USER: null
}))

jest.mock('@/lib/repositories/TalkRepositoryFactory', () => ({
  TalkRepositoryFactory: {
    create: jest.fn(() => ({
      findAll: mockGetAllTalksExecute,
      getUserVotes: mockGetUserVotesExecute,
      addUserVote: jest.fn(),
      removeUserVote: jest.fn(),
      incrementVote: jest.fn(),
      decrementVote: jest.fn()
    }))
  }
}))

jest.mock('@/lib/repositories/VotingConfigRepositoryFactory', () => ({
  VotingConfigRepositoryFactory: {
    create: jest.fn(() => ({
      getVotingConfig: mockGetVotingConfig
    }))
  }
}))

jest.mock('@/src/application/services/GetAllTalks', () => ({
  GetAllTalks: jest.fn().mockImplementation(() => ({
    execute: mockGetAllTalksExecute
  }))
}))

jest.mock('@/src/application/services/VoteTalk', () => ({
  VoteTalk: jest.fn().mockImplementation(() => ({
    execute: mockVoteTalkExecute
  }))
}))

jest.mock('@/src/application/services/GetUserVotes', () => ({
  GetUserVotes: jest.fn().mockImplementation(() => ({
    execute: mockGetUserVotesExecute
  }))
}))

jest.mock('@/src/application/services/CreateTalk', () => ({
  CreateTalk: jest.fn().mockImplementation(() => ({
    execute: mockCreateTalkExecute
  }))
}))

jest.mock('@/src/domain/valueObjects/VotingRules', () => ({
  VotingRules: jest.fn().mockImplementation(() => ({
    canCreateNewTalks: mockCanCreateNewTalks,
    isVotingEnabled: mockIsVotingEnabled
  }))
}))

describe('Home - Validación de votos en frontend', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(window, 'alert').mockImplementation(() => { })
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('debería prevenir votar una cuarta charla cuando ya se tienen 3 votos', async () => {
    const mockTalks = [
      new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor', 30, 1),
      new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor', 30, 1),
      new Talk('talk-3', 'Charla 3', 'Descripción 3', 'Autor', 30, 1),
      new Talk('talk-4', 'Charla 4', 'Descripción 4', 'Autor', 30, 0)
    ]

    mockGetAllTalksExecute.mockResolvedValue(mockTalks)
    mockGetUserVotesExecute.mockResolvedValue(['talk-1', 'talk-2', 'talk-3'])

    const alertSpy = jest.spyOn(window, 'alert')

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Charla 4')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Has votado 3 de 3 charlas')).toBeInTheDocument()
    })

    const voteLabel = screen.getAllByText('Votar')[0]
    const talkCard = voteLabel.closest('[class*="gLaqbQ"]')

    fireEvent.click(talkCard as Element)

    expect(mockVoteTalkExecute).not.toHaveBeenCalled()
  })

  it('debería permitir votar cuando el usuario tiene menos de 3 votos', async () => {
    const mockTalks = [
      new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor', 30, 1),
      new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor', 30, 0)
    ]

    mockGetAllTalksExecute.mockResolvedValue(mockTalks)
    mockGetUserVotesExecute.mockResolvedValue(['talk-1'])
    mockVoteTalkExecute.mockResolvedValue(undefined)

    const alertSpy = jest.spyOn(window, 'alert')

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Charla 2')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Votar')).toBeInTheDocument()
    })

    const voteLabel = screen.getByText('Votar')
    const talkCard = voteLabel.closest('[class*="gLaqbQ"]')

    fireEvent.click(talkCard as Element)

    await waitFor(() => {
      expect(mockVoteTalkExecute).toHaveBeenCalledWith('user-123', 'talk-2')
    })

    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('debería permitir quitar un voto incluso si el usuario tiene 3 votos', async () => {
    const mockTalks = [
      new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor', 30, 1),
      new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor', 30, 1),
      new Talk('talk-3', 'Charla 3', 'Descripción 3', 'Autor', 30, 1)
    ]

    mockGetAllTalksExecute.mockResolvedValue(mockTalks)
    mockGetUserVotesExecute.mockResolvedValue(['talk-1', 'talk-2', 'talk-3'])
    mockVoteTalkExecute.mockResolvedValue(undefined)

    const alertSpy = jest.spyOn(window, 'alert')

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Charla 1')).toBeInTheDocument()
    })

    await waitFor(() => {
      const votedLabels = screen.getAllByText('Votada')
      expect(votedLabels).toHaveLength(3)
    })

    const votedLabels = screen.getAllByText('Votada')
    const talkCard = votedLabels[0].closest('[class*="gLaqbQ"]')

    fireEvent.click(talkCard as Element)

    await waitFor(() => {
      expect(mockVoteTalkExecute).toHaveBeenCalledWith('user-123', 'talk-1')
    })

    expect(alertSpy).not.toHaveBeenCalled()
  })

  it('debería permitir votar el tercer voto sin mostrar alerta', async () => {
    const mockTalks = [
      new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor', 30, 1),
      new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor', 30, 1),
      new Talk('talk-3', 'Charla 3', 'Descripción 3', 'Autor', 30, 0)
    ]

    mockGetAllTalksExecute.mockResolvedValue(mockTalks)
    mockGetUserVotesExecute.mockResolvedValue(['talk-1', 'talk-2'])
    mockVoteTalkExecute.mockResolvedValue(undefined)

    const alertSpy = jest.spyOn(window, 'alert')

    render(<Home />)

    await waitFor(() => {
      expect(screen.getByText('Charla 3')).toBeInTheDocument()
    })

    await waitFor(() => {
      expect(screen.getByText('Votar')).toBeInTheDocument()
    })

    const voteLabel = screen.getByText('Votar')
    const talkCard = voteLabel.closest('[class*="gLaqbQ"]')

    fireEvent.click(talkCard as Element)

    await waitFor(() => {
      expect(mockVoteTalkExecute).toHaveBeenCalledWith('user-123', 'talk-3')
    })

    expect(alertSpy).not.toHaveBeenCalled()
  })
})

