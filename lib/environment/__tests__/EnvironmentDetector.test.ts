import { EnvironmentDetector } from '../EnvironmentDetector'

describe('EnvironmentDetector', () => {
  const originalEnv = process.env

  const setEnv = (nodeEnv: NodeJS.ProcessEnv['NODE_ENV'], apiMocking?: string) => {
    process.env = { ...originalEnv, NODE_ENV: nodeEnv }
    if (apiMocking === undefined) {
      delete process.env.NEXT_PUBLIC_API_MOCKING
    } else {
      process.env.NEXT_PUBLIC_API_MOCKING = apiMocking
    }
  }

  afterAll(() => {
    process.env = originalEnv
  })

  describe('isDevelopment', () => {
    it('debería retornar true cuando NODE_ENV es development', () => {
      setEnv('development')
      expect(EnvironmentDetector.isDevelopment()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es development', () => {
      setEnv('production')
      expect(EnvironmentDetector.isDevelopment()).toBe(false)
    })
  })

  describe('isProduction', () => {
    it('debería retornar true cuando NODE_ENV es production', () => {
      setEnv('production')
      expect(EnvironmentDetector.isProduction()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es production', () => {
      setEnv('development')
      expect(EnvironmentDetector.isProduction()).toBe(false)
    })
  })

  describe('isApiMockingEnabled', () => {
    it('debería estar activo en development por defecto', () => {
      setEnv('development')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(true)
    })

    it('debería estar activo en development con cualquier valor distinto de disabled', () => {
      setEnv('development', 'enabled')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(true)
    })

    it('debería estar inactivo en development con NEXT_PUBLIC_API_MOCKING=disabled', () => {
      setEnv('development', 'disabled')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(false)
    })

    it('nunca debería estar activo en production, aunque la variable lo pida', () => {
      setEnv('production', 'enabled')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(false)
    })

    it('nunca debería estar activo en production sin variable', () => {
      setEnv('production')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(false)
    })

    it('debería estar inactivo en test', () => {
      setEnv('test')
      expect(EnvironmentDetector.isApiMockingEnabled()).toBe(false)
    })
  })
})
