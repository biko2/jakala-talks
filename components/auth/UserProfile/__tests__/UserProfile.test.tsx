import { render, screen } from '@testing-library/react'
import { useRouter } from 'next/navigation'
import UserProfile from '../UserProfile'

const mockPush = jest.fn()
const mockSignOut = jest.fn()

jest.mock('next/navigation', () => ({
  useRouter: jest.fn()
}))

jest.mock('@/lib/supabase/client', () => ({
  createBrowserClient: () => ({
    auth: {
      signOut: mockSignOut
    }
  })
}))

const mockUser = {
  id: '123',
  email: 'test@example.com',
  user_metadata: {
    full_name: 'Test User',
    avatar_url: 'https://example.com/avatar.jpg'
  },
  app_metadata: {
    provider: 'google'
  }
}

describe('UserProfile', () => {
  beforeEach(() => {
    (useRouter as jest.Mock).mockReturnValue({
      push: mockPush
    })
    mockSignOut.mockClear()
    mockPush.mockClear()
  })

  it('debe mostrar la información del usuario', () => {
    render(<UserProfile user={mockUser} />)

    expect(screen.getByText('Test User')).toBeInTheDocument()
    expect(screen.getByText('test@example.com')).toBeInTheDocument()
  })

  it('debe mostrar avatar del usuario si está disponible', () => {
    render(<UserProfile user={mockUser} />)

    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(avatar).toHaveAttribute('alt', 'Test User')
  })

  it('debe mostrar el botón de cerrar sesión', () => {
    render(<UserProfile user={mockUser} />)

    const logoutButton = screen.getByText('Cerrar sesión')
    expect(logoutButton).toBeInTheDocument()
    expect(logoutButton).not.toBeDisabled()
  })
})
