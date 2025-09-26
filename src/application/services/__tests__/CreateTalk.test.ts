import { CreateTalk } from '../CreateTalk'
import { ITalkRepository } from '../../../domain/ports/TalkRepository'
import { Talk } from '../../../domain/entities/Talk'

const mockTalkRepository: ITalkRepository = {
  findAll: jest.fn(),
  findById: jest.fn(),
  create: jest.fn(),
  incrementVote: jest.fn(),
  decrementVote: jest.fn()
}

describe('CreateTalk', () => {
  let createTalk: CreateTalk

  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    createTalk = new CreateTalk(mockTalkRepository)
  })

  afterEach(() => {
    jest.useRealTimers()
  })

  it('debería lanzar error si se intenta crear charla cuando la votación está activa', async () => {
    jest.setSystemTime(new Date('2025-11-14T00:00:00.000Z'))

    await expect(
      createTalk.execute('Title', 'Description', 'Author', 30)
    ).rejects.toThrow('No se pueden crear nuevas charlas cuando la votación está activa')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería crear una charla correctamente antes de que empiece la votación', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    const title = 'Test Talk'
    const description = 'Test Description'
    const author = 'Test Author'
    const duration = 45

    const result = await createTalk.execute(title, description, author, duration)

    expect(result).toBeInstanceOf(Talk)
    expect(result.title).toBe(title)
    expect(result.description).toBe(description)
    expect(result.author).toBe(author)
    expect(result.duration).toBe(duration)
    expect(result.votes).toBe(0)
    expect(result.id).toBeDefined()
    expect(mockTalkRepository.create).toHaveBeenCalledWith(result)
  })

  it('debería lanzar error si el título está vacío', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('', 'Description', 'Author', 30)
    ).rejects.toThrow('El título es obligatorio')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si el título solo contiene espacios', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('   ', 'Description', 'Author', 30)
    ).rejects.toThrow('El título es obligatorio')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si la descripción está vacía', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', '', 'Author', 30)
    ).rejects.toThrow('La descripción es obligatoria')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si la descripción solo contiene espacios', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', '   ', 'Author', 30)
    ).rejects.toThrow('La descripción es obligatoria')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si el autor está vacío', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', 'Description', '', 30)
    ).rejects.toThrow('El autor es obligatorio')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si el autor solo contiene espacios', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', 'Description', '   ', 30)
    ).rejects.toThrow('El autor es obligatorio')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si la duración es cero', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', 'Description', 'Author', 0)
    ).rejects.toThrow('La duración debe ser mayor a 0')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería lanzar error si la duración es negativa', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    await expect(
      createTalk.execute('Title', 'Description', 'Author', -10)
    ).rejects.toThrow('La duración debe ser mayor a 0')

    expect(mockTalkRepository.create).not.toHaveBeenCalled()
  })

  it('debería limpiar espacios en blanco del título y descripción', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    const result = await createTalk.execute(
      '  Title with spaces  ',
      '  Description with spaces  ',
      '  Author with spaces  ',
      30
    )

    expect(result.title).toBe('Title with spaces')
    expect(result.description).toBe('Description with spaces')
    expect(result.author).toBe('Author with spaces')
  })

  it('debería manejar errores del repositorio', async () => {
    jest.setSystemTime(new Date('2025-11-13T23:59:59.999Z'))

    const mockError = new Error('Database error');
    (mockTalkRepository.create as jest.Mock).mockRejectedValue(mockError)

    await expect(
      createTalk.execute('Title', 'Description', 'Author', 30)
    ).rejects.toThrow('Database error')
  })
})
