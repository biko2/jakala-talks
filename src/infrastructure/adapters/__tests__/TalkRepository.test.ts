import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { Talk } from '../../../domain/entities/Talk'
import { TalkRepository } from '../TalkRepository'

// Test de integración que requiere conexión a Supabase
describe.skip('SupabaseTalkRepository (Integration)', () => {
  let repository: ITalkRepository

  beforeEach(() => {
    repository = new TalkRepository()
  })

  it('debería obtener todas las talks', async () => {
    const talks = await repository.findAll()

    expect(Array.isArray(talks)).toBe(true)
    expect(talks.length).toBeGreaterThan(0)

    talks.forEach(talk => {
      expect(talk).toBeInstanceOf(Talk)
      expect(talk.id).toBeDefined()
      expect(talk.title).toBeDefined()
      expect(talk.description).toBeDefined()
      expect(talk.author).toBeDefined()
      expect(typeof talk.votes).toBe('number')
    })
  })

  it('debería encontrar una talk por id', async () => {
    const talk = await repository.findById('1')

    expect(talk).toBeInstanceOf(Talk)
    expect(talk!.id).toBe('1')
    expect(talk!.title).toBe('Arquitectura Hexagonal en la Práctica')
    expect(talk!.author).toBe('Diego Rodríguez')
  })

  it('debería retornar null para id inexistente', async () => {
    const talk = await repository.findById('999')

    expect(talk).toBeNull()
  })

  it('debería incrementar votos correctamente', async () => {
    const initialTalk = await repository.findById('1')
    const initialVotes = initialTalk!.votes

    await repository.incrementVote('1')

    const updatedTalk = await repository.findById('1')
    expect(updatedTalk!.votes).toBe(initialVotes + 1)

    // Restaurar el estado original
    await repository.decrementVote('1')
  })

  it('debería decrementar votos correctamente', async () => {
    const initialTalk = await repository.findById('1')
    const initialVotes = initialTalk!.votes

    // Asegurar que hay al menos un voto
    if (initialVotes === 0) {
      await repository.incrementVote('1')
    }

    await repository.decrementVote('1')

    const updatedTalk = await repository.findById('1')
    expect(updatedTalk!.votes).toBe(Math.max(0, initialVotes - 1))
  })
})
