import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'
import { User } from '@supabase/supabase-js'

jest.mock('@/components/auth/UserProfile', () => {
  return function MockUserProfile({ user }: { user: User }) {
    return <div>UserProfile: {user.email}</div>
  }
})

jest.mock('@/components/google/GoogleSignInButton/GoogleSignInButton', () => ({
  GoogleSignInButtonOfficial: function MockGoogleSignInButton() {
    return <button>Continuar con Google</button>
  }
}))

const mockUser: User = {
  id: '1',
  email: 'test@example.com',
  user_metadata: { name: 'Test User' },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2023-01-01T00:00:00Z'
}

describe('Header', () => {
  it('debería renderizar el título principal', () => {
    render(<Header user={null} />)

    expect(screen.getByText('Rincón de Charlas')).toBeInTheDocument()
    expect(screen.getByAltText('Jakala Logo')).toBeInTheDocument()
  })

  it('debería mostrar botón de Google Sign In cuando no hay usuario', () => {
    render(<Header user={null} />)

    expect(screen.getByText('Continuar con Google')).toBeInTheDocument()
  })

  it('debería mostrar el perfil de usuario cuando está logeado', () => {
    render(<Header user={mockUser} />)

    expect(screen.queryByText('Continuar con Google')).not.toBeInTheDocument()
    expect(screen.getByText('UserProfile: test@example.com')).toBeInTheDocument()
  })

  it('debería tener estructura de navegación correcta', () => {
    render(<Header user={null} />)

    const logo = screen.getByAltText('Jakala Logo')
    expect(logo).toHaveAttribute('src', '/Jakala logo_rgb_white.png')
  })
})
