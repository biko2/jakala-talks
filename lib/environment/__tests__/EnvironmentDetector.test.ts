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
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      expect(EnvironmentDetector.isDevelopment()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      expect(EnvironmentDetector.isDevelopment()).toBe(false)
    })
  })

  describe('isProduction', () => {
    it('debería retornar true cuando NODE_ENV es production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      expect(EnvironmentDetector.isProduction()).toBe(true)
    })

    it('debería retornar false cuando NODE_ENV no es production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      expect(EnvironmentDetector.isProduction()).toBe(false)
    })
  })

  describe('isLocalWithSupabase', () => {
    it('debería retornar true en development cuando NEXT_PUBLIC_USE_SUPABASE es true', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_SUPABASE = 'true'
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(true)
    })

    it('debería retornar false en development cuando MSW está activo por defecto', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_USE_SUPABASE
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(false)
    })

    it('debería retornar false cuando es production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      process.env.NEXT_PUBLIC_USE_SUPABASE = 'true'
      expect(EnvironmentDetector.isLocalWithSupabase()).toBe(false)
    })
  })

  describe('isMswEnabled', () => {
    it('debería estar activo en development salvo que USE_SUPABASE sea true', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_USE_SUPABASE
      expect(EnvironmentDetector.isMswEnabled()).toBe(true)
    })

    it('debería desactivarse en development cuando NEXT_PUBLIC_USE_SUPABASE es true', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_SUPABASE = 'true'
      expect(EnvironmentDetector.isMswEnabled()).toBe(false)
    })

    it('debería estar desactivado en production aunque USE_SUPABASE no sea true', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      delete process.env.NEXT_PUBLIC_USE_SUPABASE
      expect(EnvironmentDetector.isMswEnabled()).toBe(false)
    })
  })

  describe('getEnvironmentType', () => {
    it('debería retornar msw en development por defecto', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      delete process.env.NEXT_PUBLIC_USE_SUPABASE
      expect(EnvironmentDetector.getEnvironmentType()).toBe('msw')
    })

    it('debería retornar local-supabase cuando USE_SUPABASE es true en development', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'development'
      process.env.NEXT_PUBLIC_USE_SUPABASE = 'true'
      expect(EnvironmentDetector.getEnvironmentType()).toBe('local-supabase')
    })

    it('debería retornar production cuando es production', () => {
      (process.env as Record<string, string | undefined>).NODE_ENV = 'production'
      expect(EnvironmentDetector.getEnvironmentType()).toBe('production')
    })
  })
})
