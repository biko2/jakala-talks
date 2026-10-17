/**
 * @jest-environment node
 */
import { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { proxy } from '../proxy'

jest.mock('@supabase/ssr', () => ({
  createServerClient: jest.fn(),
}))

const mockCreateServerClient = createServerClient as jest.MockedFunction<typeof createServerClient>

describe('proxy', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'development' }
    delete process.env.NEXT_PUBLIC_API_MOCKING
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('con mocking de API activo', () => {
    it('no debería consultar Supabase ni redirigir en rutas protegidas', async () => {
      const response = await proxy(new NextRequest('http://localhost:3000/privada'))

      expect(mockCreateServerClient).not.toHaveBeenCalled()
      expect(response.headers.get('location')).toBeNull()
      expect(response.status).toBe(200)
    })
  })

  describe('con mocking de API desactivado', () => {
    beforeEach(() => {
      process.env.NEXT_PUBLIC_API_MOCKING = 'disabled'
      process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://dev.supabase.co'
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = 'dev-key'
      mockCreateServerClient.mockReturnValue({
        auth: { getUser: jest.fn().mockResolvedValue({ data: { user: null } }) },
      } as unknown as ReturnType<typeof createServerClient>)
    })

    it('debería redirigir a la portada si no hay sesión en una ruta protegida', async () => {
      const response = await proxy(new NextRequest('http://localhost:3000/privada'))

      expect(mockCreateServerClient).toHaveBeenCalled()
      expect(response.headers.get('location')).toBe('http://localhost:3000/')
    })
  })
})
