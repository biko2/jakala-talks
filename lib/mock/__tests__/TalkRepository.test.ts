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

      expect(savedTalk?.id).toBe(newTalk.id)
      expect(savedTalk?.title).toBe(newTalk.title)
      expect(savedTalk?.description).toBe(newTalk.description)
      expect(savedTalk?.author).toBe(newTalk.author)
      expect(savedTalk?.duration).toBe(newTalk.duration)
    })
  })

  describe('conteo de votos', () => {
    it('debería contar los votos desde user_votes', async () => {
      await repository.addUserVote({ userId: 'user-1', talkId: 'mock-talk-2', createdAt: new Date() })
      await repository.addUserVote({ userId: 'user-2', talkId: 'mock-talk-2', createdAt: new Date() })
      await repository.addUserVote({ userId: 'user-3', talkId: 'mock-talk-2', createdAt: new Date() })

      const talk = await repository.findById('mock-talk-2')
      expect(talk?.votes).toBe(3)
    })

    it('debería actualizar el conteo cuando se elimina un voto', async () => {
      await repository.addUserVote({ userId: 'user-1', talkId: 'mock-talk-3', createdAt: new Date() })
      await repository.addUserVote({ userId: 'user-2', talkId: 'mock-talk-3', createdAt: new Date() })

      let talk = await repository.findById('mock-talk-3')
      expect(talk?.votes).toBe(2)

      await repository.removeUserVote('user-1', 'mock-talk-3')

      talk = await repository.findById('mock-talk-3')
      expect(talk?.votes).toBe(1)
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
      await repository.removeUserVote('mock-user', 'mock-talk-1')

      const votes = await repository.getUserVotes('mock-user')
      expect(votes).not.toContain('mock-talk-1')
    })
  })

  describe('hasUserVotedForTalk', () => {
    it('debería retornar true si el usuario votó por la charla', async () => {
      const hasVoted = await repository.hasUserVotedForTalk('mock-user', 'mock-talk-1')

      expect(hasVoted).toBe(true)
    })

    it('debería retornar false si el usuario no votó por la charla', async () => {
      const hasVoted = await repository.hasUserVotedForTalk('mock-user', 'mock-talk-2')

      expect(hasVoted).toBe(false)
    })
  })

  describe('getUserVotes', () => {
    it('debería retornar los votos del usuario', async () => {
      const votes = await repository.getUserVotes('mock-user')

      expect(votes).toContain('mock-talk-1')
      expect(votes).toHaveLength(1)
    })
  })
})
