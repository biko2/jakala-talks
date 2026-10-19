import { MOCK_USER, isMockMode } from '../user'

describe('Mock User', () => {
  describe('MOCK_USER', () => {
    it('debería tener un usuario mock válido', () => {
      expect(MOCK_USER.id).toBe('mock-user-123')
      expect(MOCK_USER.email).toBe('usuario.mock@jakala.com')
      expect(MOCK_USER.user_metadata?.full_name).toBe('Usuario Mock')
      expect(MOCK_USER.user_metadata?.avatar_url).toContain('ui-avatars.com')
    })

    it('debería tener metadatos de usuario válidos', () => {
      expect(MOCK_USER.user_metadata).toBeDefined()
      expect(MOCK_USER.user_metadata?.full_name).toBe('Usuario Mock')
      expect(MOCK_USER.user_metadata?.avatar_url).toBeDefined()
    })

    it('debería tener un ID único', () => {
      expect(MOCK_USER.id).toBeTruthy()
      expect(typeof MOCK_USER.id).toBe('string')
    })
  })

  describe('isMockMode', () => {
    const originalEnv = process.env

    beforeEach(() => {
      process.env = { ...originalEnv }
      delete process.env.NEXT_PUBLIC_API_MOCKING
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('debería retornar true en development con el mocking de API por defecto', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'

      expect(isMockMode()).toBe(true)
    })

    it('debería retornar false en production aunque se pida mocking', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_API_MOCKING = 'enabled'

      expect(isMockMode()).toBe(false)
    })

    it('debería retornar false cuando NEXT_PUBLIC_API_MOCKING es disabled', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_API_MOCKING = 'disabled'

      expect(isMockMode()).toBe(false)
    })
  })
})
