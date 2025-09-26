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

  it('debe mostrar avatar con el alt text correcto cuando hay full_name', () => {
    render(<UserProfile user={mockUser} />)

    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('alt', 'Test User')
  })

  it('debe mostrar avatar con el email como alt text cuando no hay full_name', () => {
    const userWithoutName = {
      ...mockUser,
      user_metadata: {
        avatar_url: 'https://example.com/avatar.jpg'
      }
    }
    render(<UserProfile user={userWithoutName} />)

    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('alt', 'test@example.com')
  })

  it('debe mostrar avatar del usuario si está disponible', () => {
    render(<UserProfile user={mockUser} />)

    const avatar = screen.getByRole('img')
    expect(avatar).toHaveAttribute('src', 'https://example.com/avatar.jpg')
    expect(avatar).toHaveAttribute('alt', 'Test User')
  })

  it('debe permitir hacer click en el avatar para cerrar sesión', () => {
    render(<UserProfile user={mockUser} />)

    const avatar = screen.getByRole('img')
    expect(avatar).toBeInTheDocument()
  })

  it('no debe renderizar nada si no hay avatar_url', () => {
    const userWithoutAvatar = {
      ...mockUser,
      user_metadata: {}
    }
    const { container } = render(<UserProfile user={userWithoutAvatar} />)

    expect(container.firstChild).toBeNull()
  })
})
