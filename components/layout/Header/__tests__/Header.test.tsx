import { render, screen, fireEvent } from '@testing-library/react'
import Header from '../Header'
import { User } from '@supabase/supabase-js'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

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

  it('no debería mostrar Google Sign In cuando MSW está activo', () => {
    jest.spyOn(EnvironmentDetector, 'isMswEnabled').mockReturnValue(true)

    render(<Header user={null} />)

    expect(screen.queryByText('Continuar con Google')).not.toBeInTheDocument()

    jest.restoreAllMocks()
  })

  it('debería mostrar el perfil de usuario cuando está logeado', () => {
    render(<Header user={mockUser} />)

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

  it('debería renderizar el link a la última edición de Open Space', () => {
    render(<Header user={null} />)

    const openSpaceLink = screen.getByText('Open de Jakala')
    expect(openSpaceLink).toBeInTheDocument()
    expect(openSpaceLink).toHaveAttribute('href', 'https://open-space.jakala.es/')
    expect(openSpaceLink).toHaveAttribute('target', '_blank')
    expect(openSpaceLink).toHaveAttribute('rel', 'noopener noreferrer')
  })

  it('debería mostrar mensaje de votación iniciada cuando votingStatus es voting', () => {
    render(
      <Header
        user={null}
        votingStatus="voting"
        closingDate={new Date('2026-09-08T00:00:00.000Z')}
      />
    )

    expect(screen.getByText(/El periodo de votación ha comenzado/)).toBeInTheDocument()
    expect(screen.getByText(/El último dia para votar es el 7 de Septiembre./)).toBeInTheDocument()
    expect(screen.queryByText(/8 de Septiembre/)).not.toBeInTheDocument()
    expect(screen.queryByText(/para poder proponer charlas y luego votar/)).not.toBeInTheDocument()
  })

  it('debería mostrar mensaje de proponer charlas cuando votingStatus es proposing', () => {
    render(<Header user={null} votingStatus="proposing" />)

    expect(screen.getByText(/para poder proponer charlas y luego votar/)).toBeInTheDocument()
    expect(screen.queryByText(/El periodo de votación ha comenzado/)).not.toBeInTheDocument()
  })

  it('debería mostrar mensaje de proponer charlas cuando votingStatus no está definido', () => {
    render(<Header user={null} />)

    expect(screen.getByText(/para poder proponer charlas y luego votar/)).toBeInTheDocument()
    expect(screen.queryByText(/El periodo de votación ha comenzado/)).not.toBeInTheDocument()
  })

  it('debería mostrar copy de votación cerrada cuando votingStatus es closed', () => {
    render(<Header user={null} votingStatus="closed" />)

    expect(screen.getByText(/La votación ha finalizado/)).toBeInTheDocument()
    expect(screen.getByText(/Continuar con Google/)).toBeInTheDocument()
    expect(screen.queryByText(/El periodo de votación ha comenzado/)).not.toBeInTheDocument()
    expect(screen.queryByText(/para poder proponer charlas y luego votar/)).not.toBeInTheDocument()
    expect(screen.queryByText(/7 de Septiembre/)).not.toBeInTheDocument()
  })

  it('no debería mostrar instrucciones de voto cuando votingStatus es closed y hay usuario', () => {
    render(<Header user={mockUser} votingStatus="closed" />)

    expect(screen.getByText(/votación ha finalizado/i)).toBeInTheDocument()
    expect(screen.queryByText(/proceso de votación/)).not.toBeInTheDocument()
    expect(screen.queryByText(/REGISTRATE UTILIZANDO TU CUENTA DE GOOGLE/)).not.toBeInTheDocument()
  })
})
