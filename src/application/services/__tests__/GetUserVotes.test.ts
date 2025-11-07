import { GetUserVotes } from '../GetUserVotes'
import { ITalkRepository } from '@/src/domain/ports/TalkRepository'

const mockTalkRepository = (): ITalkRepository => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  addUserVote: jest.fn(),
  removeUserVote: jest.fn(),
  getUserVotes: jest.fn(),
  hasUserVotedForTalk: jest.fn()
})

describe('GetUserVotes', () => {
  it('debería obtener los votos del usuario', async () => {
    const repository = mockTalkRepository()
    const expectedVotes = ['talk1', 'talk2']
      ; (repository.getUserVotes as jest.Mock).mockResolvedValue(expectedVotes)

    const useCase = new GetUserVotes(repository)
    const result = await useCase.execute('user1')

    expect(repository.getUserVotes).toHaveBeenCalledWith('user1')
    expect(result).toEqual(expectedVotes)
  })

  it('debería devolver array vacío si el usuario no tiene votos', async () => {
    const repository = mockTalkRepository()
      ; (repository.getUserVotes as jest.Mock).mockResolvedValue([])

    const useCase = new GetUserVotes(repository)
    const result = await useCase.execute('user1')

    expect(result).toEqual([])
  })
})

