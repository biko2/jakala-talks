import { MockTalkRepository } from '../TalkRepository'
import { Talk } from '@/src/domain/entities/Talk'

describe('MockTalkRepository', () => {
  let repository: MockTalkRepository

  beforeEach(() => {
    repository = new MockTalkRepository()
  })

  describe('findAll', () => {
    it('debería retornar todas las charlas mock', async () => {
      const talks = await repository.findAll()

      expect(talks).toHaveLength(3)
      expect(talks[0].title).toBe('Introducción a la Arquitectura Hexagonal')
      expect(talks[1].title).toBe('Testing en React: Mejores Prácticas')
      expect(talks[2].title).toBe('TypeScript Avanzado')
    })
  })

  describe('findById', () => {
    it('debería encontrar una charla por ID', async () => {
      const talk = await repository.findById('mock-talk-1')

      expect(talk).toBeDefined()
      expect(talk?.title).toBe('Introducción a la Arquitectura Hexagonal')
    })

    it('debería retornar null para ID inexistente', async () => {
      const talk = await repository.findById('non-existent-id')

      expect(talk).toBeNull()
    })
  })

  describe('create', () => {
    it('debería crear una nueva charla', async () => {
      const newTalk = new Talk(
        'new-talk-id',
        'Nueva Charla',
        'Descripción de la nueva charla',
        'Autor',
        30,
        0
      )

      await repository.create(newTalk)
      const savedTalk = await repository.findById('new-talk-id')

      expect(savedTalk).toEqual(newTalk)
    })
  })

  describe('incrementVote', () => {
    it('debería incrementar los votos de una charla', async () => {
      const talk = await repository.findById('mock-talk-2')
      const initialVotes = talk?.votes || 0

      await repository.incrementVote('mock-talk-2')

      const updatedTalk = await repository.findById('mock-talk-2')
      expect(updatedTalk?.votes).toBe(initialVotes + 1)
    })

    it('debería lanzar error para charla inexistente', async () => {
      await expect(repository.incrementVote('non-existent-id'))
        .rejects.toThrow('Charla no encontrada')
    })
  })

  describe('decrementVote', () => {
    it('debería decrementar los votos de una charla', async () => {
      const talk = await repository.findById('mock-talk-1')
      const initialVotes = talk?.votes || 0

      await repository.decrementVote('mock-talk-1')

      const updatedTalk = await repository.findById('mock-talk-1')
      expect(updatedTalk?.votes).toBe(Math.max(0, initialVotes - 1))
    })

    it('debería lanzar error para charla inexistente', async () => {
      await expect(repository.decrementVote('non-existent-id'))
        .rejects.toThrow('Charla no encontrada')
    })
  })

  describe('addUserVote', () => {
    it('debería agregar un voto de usuario', async () => {
      const userVote = { userId: 'user-1', talkId: 'mock-talk-2' }

      await repository.addUserVote(userVote as any)
      const votes = await repository.getUserVotes('user-1')

      expect(votes).toContain('mock-talk-2')
    })
  })

  describe('removeUserVote', () => {
    it('debería quitar un voto de usuario', async () => {
      await repository.removeUserVote('user-id', 'mock-talk-1')

      const votes = await repository.getUserVotes('user-id')
      expect(votes).not.toContain('mock-talk-1')
    })
  })

  describe('hasUserVotedForTalk', () => {
    it('debería retornar true si el usuario votó por la charla', async () => {
      const hasVoted = await repository.hasUserVotedForTalk('user-id', 'mock-talk-1')

      expect(hasVoted).toBe(true)
    })

    it('debería retornar false si el usuario no votó por la charla', async () => {
      const hasVoted = await repository.hasUserVotedForTalk('user-id', 'mock-talk-2')

      expect(hasVoted).toBe(false)
    })
  })

  describe('getUserVotes', () => {
    it('debería retornar los votos del usuario', async () => {
      const votes = await repository.getUserVotes('user-id')

      expect(votes).toContain('mock-talk-1')
      expect(votes).toHaveLength(1)
    })
  })
})
