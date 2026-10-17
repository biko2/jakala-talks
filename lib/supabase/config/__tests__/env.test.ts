import { getSupabaseUrl, getSupabaseAnonKey } from '../env'
import { MOCK_SUPABASE_URL, MOCK_SUPABASE_ANON_KEY } from '@/lib/mock/msw/constants'

describe('Configuración Supabase', () => {
  const originalEnv = process.env

  const setEnv = (vars: Record<string, string | undefined>) => {
    process.env = { ...originalEnv }
    delete process.env.NEXT_PUBLIC_SUPABASE_URL
    delete process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    delete process.env.NEXT_PUBLIC_API_MOCKING
    Object.assign(process.env, vars)
  }

  afterAll(() => {
    process.env = originalEnv
  })

  describe('con mocking de API activo', () => {
    it('debería devolver la URL y anon key falsas sin necesitar variables de Supabase', () => {
      setEnv({ NODE_ENV: 'development' })

      expect(getSupabaseUrl()).toBe(MOCK_SUPABASE_URL)
      expect(getSupabaseAnonKey()).toBe(MOCK_SUPABASE_ANON_KEY)
    })

    it('debería ignorar las variables de Supabase configuradas', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_SUPABASE_URL: 'https://real.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'real-key',
      })

      expect(getSupabaseUrl()).toBe(MOCK_SUPABASE_URL)
      expect(getSupabaseAnonKey()).toBe(MOCK_SUPABASE_ANON_KEY)
    })
  })

  describe('con mocking de API desactivado', () => {
    it('debería devolver las variables de Supabase configuradas', () => {
      setEnv({
        NODE_ENV: 'development',
        NEXT_PUBLIC_API_MOCKING: 'disabled',
        NEXT_PUBLIC_SUPABASE_URL: 'https://dev.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'dev-key',
      })

      expect(getSupabaseUrl()).toBe('https://dev.supabase.co')
      expect(getSupabaseAnonKey()).toBe('dev-key')
    })

    it('debería lanzar error si falta la URL de Supabase', () => {
      setEnv({ NODE_ENV: 'development', NEXT_PUBLIC_API_MOCKING: 'disabled' })

      expect(() => getSupabaseUrl()).toThrow('NEXT_PUBLIC_SUPABASE_URL no está configurada')
    })
  })

  describe('en production', () => {
    it('nunca debería devolver la URL falsa', () => {
      setEnv({
        NODE_ENV: 'production',
        NEXT_PUBLIC_API_MOCKING: 'enabled',
        NEXT_PUBLIC_SUPABASE_URL: 'https://prod.supabase.co',
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'prod-key',
      })

      expect(getSupabaseUrl()).toBe('https://prod.supabase.co')
      expect(getSupabaseAnonKey()).toBe('prod-key')
    })
  })
})
