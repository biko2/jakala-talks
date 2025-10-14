import { VoteTalk } from '../VoteTalk'
import { GetUserVotes } from '../GetUserVotes'
import { CreateTalk } from '../CreateTalk'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'
import { InMemoryVotingConfigRepository } from '@/src/infrastructure/adapters/InMemoryVotingConfigRepository'
import { Talk } from '@/src/domain/entities/Talk'

describe('VoteTalk - Integración: votar, desvotar y volver a votar', () => {
  let talkRepository: InMemoryTalkRepository
  let votingConfigRepository: InMemoryVotingConfigRepository
  let voteTalk: VoteTalk
  let getUserVotes: GetUserVotes
  let createTalk: CreateTalk

  beforeEach(async () => {
    jest.useFakeTimers()
    jest.setSystemTime(new Date('2025-11-07T00:00:00.000Z'))

    talkRepository = new InMemoryTalkRepository()
    votingConfigRepository = new InMemoryVotingConfigRepository({
      votingStartDate: new Date('2025-11-07T00:00:00.000Z'),
      maxVotesPerUser: 3
    })
    voteTalk = new VoteTalk(talkRepository, votingConfigRepository)
    getUserVotes = new GetUserVotes(talkRepository)
    createTalk = new CreateTalk(talkRepository, votingConfigRepository)

    const talk1 = new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor 1', 30, 0)
    const talk2 = new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor 2', 45, 0)
    await talkRepository.create(talk1)
    await talkRepository.create(talk2)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('debería permitir votar una charla después de haberla desvotado', async () => {
    const userId = 'user-123'
    const talks = await talkRepository.findAll()
    const talkId = talks[0].id

    let talk = await talkRepository.findById(talkId)
    expect(talk?.votes).toBe(0)

    await voteTalk.execute(userId, talkId)

    let userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toContain(talkId)
    expect(userVotes.length).toBe(1)

    talk = await talkRepository.findById(talkId)
    expect(talk?.votes).toBe(1)

    await voteTalk.execute(userId, talkId)

    userVotes = await getUserVotes.execute(userId)
    expect(userVotes).not.toContain(talkId)
    expect(userVotes.length).toBe(0)

    talk = await talkRepository.findById(talkId)
    expect(talk?.votes).toBe(0)

    await voteTalk.execute(userId, talkId)

    userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toContain(talkId)
    expect(userVotes.length).toBe(1)

    talk = await talkRepository.findById(talkId)
    expect(talk?.votes).toBe(1)
  })

  it('debería permitir votar múltiples charlas, desvotar una y volver a votarla', async () => {
    const userId = 'user-456'
    const talks = await talkRepository.findAll()
    const talkId1 = talks[0].id
    const talkId2 = talks[1].id

    await voteTalk.execute(userId, talkId1)
    await voteTalk.execute(userId, talkId2)

    let userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toContain(talkId1)
    expect(userVotes).toContain(talkId2)
    expect(userVotes.length).toBe(2)

    await voteTalk.execute(userId, talkId1)

    userVotes = await getUserVotes.execute(userId)
    expect(userVotes).not.toContain(talkId1)
    expect(userVotes).toContain(talkId2)
    expect(userVotes.length).toBe(1)

    await voteTalk.execute(userId, talkId1)

    userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toContain(talkId1)
    expect(userVotes).toContain(talkId2)
    expect(userVotes.length).toBe(2)
  })

  it('debería mantener el estado correcto después de múltiples operaciones de voto', async () => {
    const userId = 'user-789'
    const talks = await talkRepository.findAll()
    const talkId1 = talks[0].id
    const talkId2 = talks[1].id

    await voteTalk.execute(userId, talkId1)
    await voteTalk.execute(userId, talkId1)
    await voteTalk.execute(userId, talkId1)

    let userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toContain(talkId1)
    expect(userVotes.length).toBe(1)

    let talk1 = await talkRepository.findById(talkId1)
    expect(talk1?.votes).toBe(1)

    await voteTalk.execute(userId, talkId2)
    await voteTalk.execute(userId, talkId1)
    await voteTalk.execute(userId, talkId2)

    userVotes = await getUserVotes.execute(userId)
    expect(userVotes).toEqual([])
    expect(userVotes.length).toBe(0)

    talk1 = await talkRepository.findById(talkId1)
    const talk2 = await talkRepository.findById(talkId2)
    expect(talk1?.votes).toBe(0)
    expect(talk2?.votes).toBe(0)
  })
})

