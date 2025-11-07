import { VoteTalk } from '../VoteTalk'
import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { VotingConfigRepository } from '@/src/domain/ports/VotingConfigRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'

const mockTalkRepository = (): ITalkRepository => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  addUserVote: jest.fn(),
  removeUserVote: jest.fn(),
  getUserVotes: jest.fn(),
  hasUserVotedForTalk: jest.fn()
})

const mockVotingConfigRepository = (): VotingConfigRepository => ({
  getVotingConfig: jest.fn()
})

describe('VoteTalk', () => {
  let mockConfigRepo: jest.Mocked<VotingConfigRepository>

  beforeEach(() => {
    jest.useFakeTimers()
    mockConfigRepo = mockVotingConfigRepository() as jest.Mocked<VotingConfigRepository>
    mockConfigRepo.getVotingConfig.mockResolvedValue({
      votingStartDate: new Date('2025-11-07T00:00:00.000Z'),
      maxVotesPerUser: 3
    })
  })

  afterEach(() => {
    jest.clearAllMocks()
    jest.useRealTimers()
  })
  describe('cuando el usuario no ha votado por la charla', () => {
    it('debería agregar voto si no se han alcanzado los límites', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const repository = mockTalkRepository()
        ; (repository.getUserVotes as jest.Mock).mockResolvedValue(['talk1'])
        ; (repository.addUserVote as jest.Mock).mockResolvedValue(undefined)

      const useCase = new VoteTalk(repository, mockConfigRepo)
      await useCase.execute('user1', 'talk2')

      expect(repository.getUserVotes).toHaveBeenCalledWith('user1')
      expect(repository.addUserVote).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user1',
        talkId: 'talk2'
      }))
    })

    it('debería lanzar error si el usuario ya tiene 3 votos', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const repository = mockTalkRepository()
        ; (repository.getUserVotes as jest.Mock).mockResolvedValue(['talk1', 'talk2', 'talk3'])

      const useCase = new VoteTalk(repository, mockConfigRepo)

      await expect(useCase.execute('user1', 'talk4'))
        .rejects.toThrow('Solo puedes votar un máximo de 3 charlas')
    })
  })

  describe('cuando el usuario ya ha votado por la charla', () => {
    it('debería quitar el voto (toggle)', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const repository = mockTalkRepository()
        ; (repository.getUserVotes as jest.Mock).mockResolvedValue(['talk1', 'talk2'])
        ; (repository.removeUserVote as jest.Mock).mockResolvedValue(undefined)

      const useCase = new VoteTalk(repository, mockConfigRepo)
      await useCase.execute('user1', 'talk1')

      expect(repository.getUserVotes).toHaveBeenCalledWith('user1')
      expect(repository.removeUserVote).toHaveBeenCalledWith('user1', 'talk1')
    })
  })

  describe('casos edge', () => {
    it('debería permitir votar cuando no tiene votos previos', async () => {
      jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))
      const repository = mockTalkRepository()
        ; (repository.getUserVotes as jest.Mock).mockResolvedValue([])
        ; (repository.addUserVote as jest.Mock).mockResolvedValue(undefined)

      const useCase = new VoteTalk(repository, mockConfigRepo)
      await useCase.execute('user1', 'talk1')

      expect(repository.addUserVote).toHaveBeenCalled()
    })
  })
})
