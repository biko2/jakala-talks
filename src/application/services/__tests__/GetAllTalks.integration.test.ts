import { GetAllTalks } from '../GetAllTalks'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'
import { Talk } from '@/src/domain/entities/Talk'
import { UserVote } from '@/src/domain/entities/UserVote'

describe('Integración - Listado de charlas con votos', () => {
  it('debería devolver el recuento global de votos de todos los usuarios', async () => {
    const talkRepo = new InMemoryTalkRepository()
    const getAllTalks = new GetAllTalks(talkRepo)

    await talkRepo.create(new Talk('talk-1', 'Charla 1', 'Descripción 1', 'Autor 1', 30, 0))
    await talkRepo.create(new Talk('talk-2', 'Charla 2', 'Descripción 2', 'Autor 2', 45, 0))

    await talkRepo.addUserVote(new UserVote('user-1', 'talk-1'))
    await talkRepo.addUserVote(new UserVote('user-2', 'talk-1'))
    await talkRepo.addUserVote(new UserVote('user-3', 'talk-1'))
    await talkRepo.addUserVote(new UserVote('user-1', 'talk-2'))

    const talks = await getAllTalks.execute()
    const talk1 = talks.find(talk => talk.id === 'talk-1')
    const talk2 = talks.find(talk => talk.id === 'talk-2')

    expect(talk1?.votes).toBe(3)
    expect(talk2?.votes).toBe(1)
  })
})
