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
    expect(logo).toHaveAttribute('src', '/Logo.svg')
  })

  it('debería mostrar botón de nueva charla cuando usuario está logeado y canCreateNewTalks es true', () => {
    const onNewTalkClick = jest.fn()
    render(<Header user={mockUser} onNewTalkClick={onNewTalkClick} canCreateNewTalks={true} />)

    const newTalkButton = screen.getByRole('button', { name: /nueva charla/i })
    expect(newTalkButton).toBeInTheDocument()

    fireEvent.click(newTalkButton)
    expect(onNewTalkClick).toHaveBeenCalledTimes(1)
  })

  it('no debería mostrar botón de nueva charla cuando canCreateNewTalks es false', () => {
    const onNewTalkClick = jest.fn()
    render(<Header user={mockUser} onNewTalkClick={onNewTalkClick} canCreateNewTalks={false} />)

    const newTalkButton = screen.queryByRole('button', { name: /nueva charla/i })
    expect(newTalkButton).not.toBeInTheDocument()
  })

  it('no debería mostrar botón de nueva charla cuando no hay usuario', () => {
    const onNewTalkClick = jest.fn()
    render(<Header user={null} onNewTalkClick={onNewTalkClick} canCreateNewTalks={true} />)

    const newTalkButton = screen.queryByRole('button', { name: /nueva charla/i })
    expect(newTalkButton).not.toBeInTheDocument()
  })
})
