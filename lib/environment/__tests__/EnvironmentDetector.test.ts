import { EnvironmentDetector } from '../EnvironmentDetector'

describe('EnvironmentDetector', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.resetModules()
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('isDevelopment', () => {
    it('debería retornar true cuando NODE_ENV es development', () => {
      process.env.NODE_ENV = 'development'
      expect(EnvironmentDetector.isDevelopment()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es development', () => {
      process.env.NODE_ENV = 'production'
      expect(EnvironmentDetector.isDevelopment()).toBe(false)
    })
  })

  describe('isProduction', () => {
    it('debería retornar true cuando NODE_ENV es production', () => {
      process.env.NODE_ENV = 'production'
      expect(EnvironmentDetector.isProduction()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es production', () => {
      process.env.NODE_ENV = 'development'
      expect(EnvironmentDetector.isProduction()).toBe(false)
    })
  })

  describe('isMockMode', () => {
    it('debería retornar true cuando es development y USE_MOCK_USER es true', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'
      expect(EnvironmentDetector.isMockMode()).toBe(true)
    })

    it('debería retornar false cuando es production', () => {
      process.env.NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'
      expect(EnvironmentDetector.isMockMode()).toBe(false)
    })

    it('debería retornar false cuando USE_MOCK_USER no es true', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'false'
      expect(EnvironmentDetector.isMockMode()).toBe(false)
    })
  })

  describe('isLocalWithSupabase', () => {
    it('debería retornar true cuando es development pero no mock mode', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'false'
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(true)
    })

    it('debería retornar false cuando es mock mode', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(false)
    })

    it('debería retornar false cuando es production', () => {
      process.env.NODE_ENV = 'production'
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(false)
    })
  })

  describe('getEnvironmentType', () => {
    it('debería retornar mock cuando está en modo mock', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'true'
      expect(EnvironmentDetector.getEnvironmentType()).toBe('mock')
    })

    it('debería retornar local-supabase cuando es development sin mock', () => {
      process.env.NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_MOCK_USER = 'false'
      expect(EnvironmentDetector.getEnvironmentType()).toBe('local-supabase')
    })

    it('debería retornar production cuando es production', () => {
      process.env.NODE_ENV = 'production'
      expect(EnvironmentDetector.getEnvironmentType()).toBe('production')
    })
  })
})
