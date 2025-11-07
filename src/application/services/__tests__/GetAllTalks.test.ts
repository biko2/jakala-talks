import { GetAllTalks } from '../GetAllTalks'
import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { Talk } from '@/src/domain/entities/Talk'

const mockTalkRepository = (): ITalkRepository => ({
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  addUserVote: jest.fn(),
  removeUserVote: jest.fn(),
  getUserVotes: jest.fn(),
  hasUserVotedForTalk: jest.fn()
})

describe('GetAllTalks', () => {
  it('debería obtener todas las charlas', async () => {
    const talks = [
      new Talk('1', 'Charla 1', 'Descripción 1', 'Autor 1', 30),
      new Talk('2', 'Charla 2', 'Descripción 2', 'Autor 2', 45)
    ]

    const repository = mockTalkRepository()
      ; (repository.findAll as jest.Mock).mockResolvedValue(talks)

    const useCase = new GetAllTalks(repository)
    const result = await useCase.execute()

    expect(result).toEqual(talks)
    expect(repository.findAll).toHaveBeenCalledTimes(1)
  })

  it('debería manejar repositorio vacío', async () => {
    const repository = mockTalkRepository()
      ; (repository.findAll as jest.Mock).mockResolvedValue([])

    const useCase = new GetAllTalks(repository)
    const result = await useCase.execute()

    expect(result).toEqual([])
    expect(repository.findAll).toHaveBeenCalledTimes(1)
  })
})
