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
      jest.resetModules()
      process.env = { ...originalEnv }
    })

    afterAll(() => {
      process.env = originalEnv
    })

    it('debería retornar true cuando NODE_ENV es development y USE_MOCK_USER es true', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'

      expect(isMockMode()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es development', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'

      expect(isMockMode()).toBe(false)
    })

    it('debería retornar false cuando USE_MOCK_USER no es true', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'false'

      expect(isMockMode()).toBe(false)
    })

    it('debería retornar false cuando USE_MOCK_USER no está definido', () => {
      process.env.NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_USE_MOCK_USER

      expect(isMockMode()).toBe(false)
    })
  })
})
