import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { Talk } from '../../../domain/entities/Talk'
import { InMemoryTalkRepository } from '../InMemoryTalkRepository'

describe('InMemoryTalkRepository', () => {
  let repository: ITalkRepository

  beforeEach(() => {
    repository = new InMemoryTalkRepository()
  })

  it('debería obtener todas las talks', async () => {
    const talk1 = new Talk('1', 'Talk 1', 'Description 1', 'Author 1', 30, 0)
    const talk2 = new Talk('2', 'Talk 2', 'Description 2', 'Author 2', 45, 0)

    await repository.create(talk1)
    await repository.create(talk2)

    const talks = await repository.findAll()

    expect(Array.isArray(talks)).toBe(true)
    expect(talks.length).toBe(2)

    talks.forEach(talk => {
      expect(talk).toBeInstanceOf(Talk)
      expect(talk.id).toBeDefined()
      expect(talk.title).toBeDefined()
      expect(talk.description).toBeDefined()
      expect(talk.author).toBeDefined()
      expect(typeof talk.duration).toBe('number')
      expect(typeof talk.votes).toBe('number')
    })
  })

  it('debería encontrar una talk por id', async () => {
    const newTalk = new Talk('1', 'Test Talk', 'Test Description', 'Test Author', 30, 0)
    await repository.create(newTalk)

    const talk = await repository.findById('1')

    expect(talk).toBeInstanceOf(Talk)
    expect(talk!.id).toBe('1')
    expect(talk!.title).toBe('Test Talk')
    expect(talk!.author).toBe('Test Author')
  })

  it('debería retornar null para id inexistente', async () => {
    const talk = await repository.findById('999')

    expect(talk).toBeNull()
  })

  it('debería contar votos desde user_votes', async () => {
    const newTalk = new Talk('1', 'Test Talk', 'Test Description', 'Test Author', 30, 0)
    await repository.create(newTalk)

    const userVote1 = { userId: 'user-1', talkId: '1', createdAt: new Date() }
    const userVote2 = { userId: 'user-2', talkId: '1', createdAt: new Date() }
    const userVote3 = { userId: 'user-3', talkId: '1', createdAt: new Date() }

    await repository.addUserVote(userVote1)
    await repository.addUserVote(userVote2)
    await repository.addUserVote(userVote3)

    const talkWithVotes = await repository.findById('1')
    expect(talkWithVotes!.votes).toBe(3)
  })

  it('debería actualizar el conteo de votos cuando se elimina un voto', async () => {
    const newTalk = new Talk('1', 'Test Talk', 'Test Description', 'Test Author', 30, 0)
    await repository.create(newTalk)

    const userVote1 = { userId: 'user-1', talkId: '1', createdAt: new Date() }
    const userVote2 = { userId: 'user-2', talkId: '1', createdAt: new Date() }

    await repository.addUserVote(userVote1)
    await repository.addUserVote(userVote2)

    let talkWithVotes = await repository.findById('1')
    expect(talkWithVotes!.votes).toBe(2)

    await repository.removeUserVote('user-1', '1')

    talkWithVotes = await repository.findById('1')
    expect(talkWithVotes!.votes).toBe(1)
  })

  it('debería contar correctamente votos de diferentes charlas', async () => {
    const talk1 = new Talk('1', 'Talk 1', 'Description 1', 'Author 1', 30, 0)
    const talk2 = new Talk('2', 'Talk 2', 'Description 2', 'Author 2', 45, 0)

    await repository.create(talk1)
    await repository.create(talk2)

    const userVote1 = { userId: 'user-1', talkId: '1', createdAt: new Date() }
    const userVote2 = { userId: 'user-2', talkId: '1', createdAt: new Date() }
    const userVote3 = { userId: 'user-3', talkId: '2', createdAt: new Date() }

    await repository.addUserVote(userVote1)
    await repository.addUserVote(userVote2)
    await repository.addUserVote(userVote3)

    const talks = await repository.findAll()
    const talkWithId1 = talks.find(t => t.id === '1')
    const talkWithId2 = talks.find(t => t.id === '2')

    expect(talkWithId1!.votes).toBe(2)
    expect(talkWithId2!.votes).toBe(1)
  })

  it('debería crear una nueva charla correctamente', async () => {
    const newTalk = new Talk(
      'test-123',
      'Test Talk',
      'Test Description',
      'Test Author',
      45,
      0
    )

    await repository.create(newTalk)

    const createdTalk = await repository.findById(newTalk.id)
    expect(createdTalk).toBeInstanceOf(Talk)
    expect(createdTalk!.id).toBe(newTalk.id)
    expect(createdTalk!.title).toBe(newTalk.title)
    expect(createdTalk!.description).toBe(newTalk.description)
    expect(createdTalk!.author).toBe(newTalk.author)
    expect(createdTalk!.duration).toBe(newTalk.duration)
    expect(createdTalk!.votes).toBe(newTalk.votes)
  })

  it('debería agregar un voto de usuario correctamente', async () => {
    const userVote = { userId: 'user-1', talkId: 'talk-1', createdAt: new Date() }

    await repository.addUserVote(userVote)

    const hasVoted = await repository.hasUserVotedForTalk('user-1', 'talk-1')
    expect(hasVoted).toBe(true)
  })

  it('debería eliminar un voto de usuario correctamente', async () => {
    const userVote = { userId: 'user-1', talkId: 'talk-1', createdAt: new Date() }

    await repository.addUserVote(userVote)
    await repository.removeUserVote('user-1', 'talk-1')

    const hasVoted = await repository.hasUserVotedForTalk('user-1', 'talk-1')
    expect(hasVoted).toBe(false)
  })

  it('debería obtener todos los votos de un usuario', async () => {
    const userVote1 = { userId: 'user-1', talkId: 'talk-1', createdAt: new Date() }
    const userVote2 = { userId: 'user-1', talkId: 'talk-2', createdAt: new Date() }
    const userVote3 = { userId: 'user-2', talkId: 'talk-3', createdAt: new Date() }

    await repository.addUserVote(userVote1)
    await repository.addUserVote(userVote2)
    await repository.addUserVote(userVote3)

    const votes = await repository.getUserVotes('user-1')

    expect(votes.length).toBe(2)
    expect(votes).toContain('talk-1')
    expect(votes).toContain('talk-2')
    expect(votes).not.toContain('talk-3')
  })

  it('debería retornar false cuando el usuario no ha votado', async () => {
    const hasVoted = await repository.hasUserVotedForTalk('user-1', 'talk-1')
    expect(hasVoted).toBe(false)
  })

  it('debería retornar un array vacío cuando el usuario no tiene votos', async () => {
    const votes = await repository.getUserVotes('user-1')
    expect(votes).toEqual([])
  })
})
