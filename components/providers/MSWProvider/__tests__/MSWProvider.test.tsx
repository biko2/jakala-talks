import { act, render, screen } from '@testing-library/react'
import MSWProvider from '../MSWProvider'
import { startWorker } from '@/lib/mock/msw/browser'

jest.mock('@/lib/mock/msw/browser', () => ({
  startWorker: jest.fn(),
}))

const mockStartWorker = startWorker as jest.MockedFunction<typeof startWorker>

describe('MSWProvider', () => {
  const originalEnv = process.env

  beforeEach(() => {
    jest.clearAllMocks()
    process.env = { ...originalEnv, NODE_ENV: 'development' }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  describe('con mocking de API inactivo', () => {
    it('debería pintar los hijos de inmediato sin arrancar el worker', () => {
      process.env.NEXT_PUBLIC_API_MOCKING = 'disabled'

      render(<MSWProvider><p>Contenido</p></MSWProvider>)

      expect(screen.getByText('Contenido')).toBeInTheDocument()
      expect(mockStartWorker).not.toHaveBeenCalled()
    })
  })

  describe('con mocking de API activo', () => {
    beforeEach(() => {
      delete process.env.NEXT_PUBLIC_API_MOCKING
    })

    it('no debería pintar los hijos hasta que el worker arranca', async () => {
      let resolveStart: () => void = () => {}
      mockStartWorker.mockReturnValue(new Promise<void>(resolve => { resolveStart = resolve }))

      render(<MSWProvider><p>Contenido</p></MSWProvider>)

      await act(async () => {})
      expect(mockStartWorker).toHaveBeenCalled()
      expect(screen.queryByText('Contenido')).not.toBeInTheDocument()

      await act(async () => resolveStart())

      expect(screen.getByText('Contenido')).toBeInTheDocument()
    })

    it('debería pintar los hijos y avisar por consola si el worker no arranca', async () => {
      const consoleError = jest.spyOn(console, 'error').mockImplementation(() => {})
      const failure = new Error('sin service worker')
      mockStartWorker.mockRejectedValue(failure)

      render(<MSWProvider><p>Contenido</p></MSWProvider>)

      expect(await screen.findByText('Contenido')).toBeInTheDocument()
      expect(consoleError).toHaveBeenCalledWith('No se pudo arrancar Mock Service Worker:', failure)
      consoleError.mockRestore()
    })
  })
})
