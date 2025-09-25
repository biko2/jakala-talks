import { Talk } from '../Talk'

describe('Talk', () => {
  const sampleTalk = new Talk(
    '1',
    'Arquitectura Hexagonal',
    'Una charla sobre arquitectura',
    'Diego Rodríguez',
    5
  )

  it('debería crear una charla correctamente', () => {
    expect(sampleTalk.id).toBe('1')
    expect(sampleTalk.title).toBe('Arquitectura Hexagonal')
    expect(sampleTalk.description).toBe('Una charla sobre arquitectura')
    expect(sampleTalk.author).toBe('Diego Rodríguez')
    expect(sampleTalk.votes).toBe(5)
  })

  it('debería crear una charla con votos por defecto', () => {
    const defaultTalk = new Talk(
      '2',
      'Test Talk',
      'Test Description',
      'Test Author'
    )

    expect(defaultTalk.votes).toBe(0)
  })

  it('debería añadir un voto correctamente', () => {
    const votedTalk = sampleTalk.addVote()

    expect(votedTalk.votes).toBe(6)
    expect(votedTalk.id).toBe(sampleTalk.id)
    expect(votedTalk.title).toBe(sampleTalk.title)
  })

  it('debería quitar un voto correctamente', () => {
    const unvotedTalk = sampleTalk.removeVote()

    expect(unvotedTalk.votes).toBe(4)
    expect(unvotedTalk.id).toBe(sampleTalk.id)
  })

  it('no debería permitir votos negativos', () => {
    const zeroVotesTalk = new Talk('3', 'Test', 'Test', 'Test', 0)
    const unvotedTalk = zeroVotesTalk.removeVote()

    expect(unvotedTalk.votes).toBe(0)
  })

  it('debería mantener inmutabilidad al modificar votos', () => {
    const votedTalk = sampleTalk.addVote()

    expect(sampleTalk.votes).toBe(5)
    expect(votedTalk.votes).toBe(6)
    expect(sampleTalk).not.toBe(votedTalk)
  })
})
