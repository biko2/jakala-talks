import { TalkRepositoryFactory } from '../TalkRepositoryFactory'
import { EnvironmentDetector } from '../../environment/EnvironmentDetector'

// Mock de los módulos
jest.mock('../../environment/EnvironmentDetector')
jest.mock('@/src/infrastructure/adapters/TalkRepository')
jest.mock('@/lib/mock/TalkRepository')
jest.mock('@/lib/supabase/client')

const mockEnvironmentDetector = EnvironmentDetector as jest.Mocked<typeof EnvironmentDetector>

describe('TalkRepositoryFactory', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('create', () => {
    it('debería crear MockTalkRepository cuando está en modo mock', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('mock')

      const repository = TalkRepositoryFactory.create()

      expect(repository).toBeDefined()
    })

    it('debería crear TalkRepository cuando está en modo local-supabase', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('local-supabase')

      const repository = TalkRepositoryFactory.create()

      expect(repository).toBeDefined()
    })

    it('debería crear TalkRepository cuando está en producción', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('production')

      const repository = TalkRepositoryFactory.create()

      expect(repository).toBeDefined()
    })

    it('debería lanzar error para entorno no soportado', () => {
      mockEnvironmentDetector.getEnvironmentType.mockReturnValue('unknown' as any)

      expect(() => TalkRepositoryFactory.create())
        .toThrow('Entorno no soportado: unknown')
    })
  })

  describe('createForTesting', () => {
    it('debería crear MockTalkRepository para testing', () => {
      const repository = TalkRepositoryFactory.createForTesting()

      expect(repository).toBeDefined()
    })
  })
})
