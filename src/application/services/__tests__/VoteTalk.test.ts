import { VoteTalk } from '../VoteTalk'
import { TalkRepository } from '@/src/domain/ports/TalkRepository'

const mockTalkRepository = (): TalkRepository => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  incrementVote: jest.fn(),
  decrementVote: jest.fn()
})

describe('VoteTalk', () => {
  it('debería incrementar votos de una charla', async () => {
    const repository = mockTalkRepository()
      ; (repository.incrementVote as jest.Mock).mockResolvedValue(undefined)

    const useCase = new VoteTalk(repository)
    await useCase.execute('1', true)

    expect(repository.incrementVote).toHaveBeenCalledWith('1')
    expect(repository.incrementVote).toHaveBeenCalledTimes(1)
  })

  it('debería decrementar votos de una charla', async () => {
    const repository = mockTalkRepository()
      ; (repository.decrementVote as jest.Mock).mockResolvedValue(undefined)

    const useCase = new VoteTalk(repository)
    await useCase.execute('1', false)

    expect(repository.decrementVote).toHaveBeenCalledWith('1')
    expect(repository.decrementVote).toHaveBeenCalledTimes(1)
  })
})
