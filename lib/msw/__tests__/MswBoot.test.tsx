import { render, screen, waitFor } from '@testing-library/react'
import MswBoot from '../MswBoot'

const setSession = jest.fn().mockResolvedValue({ error: null })
const startBrowserMsw = jest.fn().mockResolvedValue(undefined)

jest.mock('../startBrowserMsw', () => ({
  startBrowserMsw: (...args: unknown[]) => startBrowserMsw(...args)
}))

jest.mock('@/src/infrastructure/msw/authUser', () => ({
  createMswSession: () => ({
    access_token: 'msw-access-token',
    refresh_token: 'msw-refresh-token'
  })
}))

jest.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      setSession
    }
  })
}))

describe('MswBoot', () => {
  it('debería mostrar Cargando y luego los hijos tras arrancar MSW y setSession', async () => {
    render(
      <MswBoot>
        <p>listo</p>
      </MswBoot>
    )

    expect(screen.getByText('Cargando...')).toBeInTheDocument()

    await waitFor(() => {
      expect(screen.getByText('listo')).toBeInTheDocument()
    })

    expect(startBrowserMsw).toHaveBeenCalledTimes(1)
    expect(setSession).toHaveBeenCalledTimes(1)
    expect(setSession).toHaveBeenCalledWith({
      access_token: 'msw-access-token',
      refresh_token: 'msw-refresh-token'
    })
  })
})
