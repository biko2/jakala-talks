import { Talk } from '../Talk'

describe('Talk', () => {
  const sampleTalk = new Talk(
    '1',
    'Arquitectura Hexagonal',
    'Una charla sobre arquitectura',
    'Diego Rodríguez',
    45,
    5
  )

  it('debería crear una charla correctamente', () => {
    expect(sampleTalk.id).toBe('1')
    expect(sampleTalk.title).toBe('Arquitectura Hexagonal')
    expect(sampleTalk.description).toBe('Una charla sobre arquitectura')
    expect(sampleTalk.author).toBe('Diego Rodríguez')
    expect(sampleTalk.duration).toBe(45)
    expect(sampleTalk.votes).toBe(5)
  })

  it('debería crear una charla con votos por defecto', () => {
    const defaultTalk = new Talk(
      '2',
      'Test Talk',
      'Test Description',
      'Test Author',
      30
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
    const zeroVotesTalk = new Talk('3', 'Test', 'Test', 'Test', 30, 0)
    const unvotedTalk = zeroVotesTalk.removeVote()

    expect(unvotedTalk.votes).toBe(0)
  })

  it('debería mantener inmutabilidad al modificar votos', () => {
    const votedTalk = sampleTalk.addVote()

    expect(sampleTalk.votes).toBe(5)
    expect(votedTalk.votes).toBe(6)
    expect(sampleTalk).not.toBe(votedTalk)
  })

  describe('Validaciones de título', () => {
    it('debería lanzar error si el título está vacío', () => {
      expect(() => {
        new Talk('1', '', 'Descripción válida', 'Autor', 30)
      }).toThrow('El título es obligatorio')
    })

    it('debería lanzar error si el título solo contiene espacios', () => {
      expect(() => {
        new Talk('1', '   ', 'Descripción válida', 'Autor', 30)
      }).toThrow('El título es obligatorio')
    })

    it('debería lanzar error si el título excede los 50 caracteres', () => {
      const longTitle = 'a'.repeat(51)
      expect(() => {
        new Talk('1', longTitle, 'Descripción válida', 'Autor', 30)
      }).toThrow('El título no puede exceder los 50 caracteres')
    })

    it('debería aceptar un título de exactamente 50 caracteres', () => {
      const title50Chars = 'a'.repeat(50)
      const talk = new Talk('1', title50Chars, 'Descripción válida', 'Autor', 30)
      expect(talk.title).toBe(title50Chars)
    })
  })

  describe('Validaciones de descripción', () => {
    it('debería lanzar error si la descripción está vacía', () => {
      expect(() => {
        new Talk('1', 'Título válido', '', 'Autor', 30)
      }).toThrow('La descripción es obligatoria')
    })

    it('debería lanzar error si la descripción solo contiene espacios', () => {
      expect(() => {
        new Talk('1', 'Título válido', '   ', 'Autor', 30)
      }).toThrow('La descripción es obligatoria')
    })

    it('debería lanzar error si la descripción excede los 250 caracteres', () => {
      const longDescription = 'a'.repeat(251)
      expect(() => {
        new Talk('1', 'Título válido', longDescription, 'Autor', 30)
      }).toThrow('La descripción no puede exceder los 250 caracteres')
    })

    it('debería aceptar una descripción de exactamente 250 caracteres', () => {
      const description250Chars = 'a'.repeat(250)
      const talk = new Talk('1', 'Título válido', description250Chars, 'Autor', 30)
      expect(talk.description).toBe(description250Chars)
    })
  })
})
