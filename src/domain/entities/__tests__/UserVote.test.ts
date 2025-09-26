import { UserVote } from '../UserVote'

describe('UserVote', () => {
  it('debería crear un voto de usuario correctamente', () => {
    const userId = 'user1'
    const talkId = 'talk1'
    const userVote = new UserVote(userId, talkId)

    expect(userVote.userId).toBe(userId)
    expect(userVote.talkId).toBe(talkId)
    expect(userVote.createdAt).toBeInstanceOf(Date)
  })

  it('debería crear un voto con fecha personalizada', () => {
    const userId = 'user1'
    const talkId = 'talk1'
    const customDate = new Date('2023-01-01')
    const userVote = new UserVote(userId, talkId, customDate)

    expect(userVote.createdAt).toBe(customDate)
  })
})

