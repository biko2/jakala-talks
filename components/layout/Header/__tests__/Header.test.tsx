import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'
import { User } from '@supabase/supabase-js'

jest.mock('@/components/auth/UserProfile', () => {
  return function MockUserProfile({ user }: { user: User }) {
    return <div>UserProfile: {user.email}</div>
  }
})

jest.mock('@/components/auth/LoginForm', () => {
  return function MockLoginForm() {
    return <div>LoginForm Component</div>
  }
})

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

    expect(screen.getByText('Jakala')).toBeInTheDocument()
    expect(screen.getByText('Talks')).toBeInTheDocument()
    expect(screen.getByText('Rincón de charlas')).toBeInTheDocument()
  })

  it('debería mostrar prompt de login cuando no hay usuario', () => {
    render(<Header user={null} />)

    expect(screen.getByText('Inicia sesión para votar')).toBeInTheDocument()
  })

  it('debería mostrar el formulario de login cuando se hace click en el botón', () => {
    render(<Header user={null} />)

    const loginButton = screen.getByText('Inicia sesión para votar')
    fireEvent.click(loginButton)

    expect(screen.getByText('Ocultar login')).toBeInTheDocument()
  })

  it('debería mostrar el perfil de usuario cuando está logeado', () => {
    render(<Header user={mockUser} />)

    expect(screen.queryByText('Inicia sesión para votar')).not.toBeInTheDocument()
    expect(screen.getByText('UserProfile: test@example.com')).toBeInTheDocument()
  })

  it('debería tener estructura de navegación correcta', () => {
    render(<Header user={null} />)

    expect(screen.getByText('Rincón de Charlas')).toBeInTheDocument()
  })
})
