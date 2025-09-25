import { render, screen, fireEvent } from '@testing-library/react'
import GoogleSignInButton, { GoogleSignInButtonOfficial } from '../GoogleSignInButton'

describe('GoogleSignInButton', () => {
  it('debería renderizar con el texto por defecto', () => {
    render(<GoogleSignInButton />)

    expect(screen.getByText('Acceder con Google')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('debería tener la estructura correcta de clases de Google', () => {
    render(<GoogleSignInButton />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('gsi-material-button')
    expect(button.querySelector('.gsi-material-button-state')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-content-wrapper')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-icon')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-contents')).toBeInTheDocument()
  })

  it('debería renderizar con diferentes textos', () => {
    render(<GoogleSignInButton text="signup_with" />)

    expect(screen.getByText('Registrarse con Google')).toBeInTheDocument()
  })

  it('debería renderizar texto "Continuar con Google"', () => {
    render(<GoogleSignInButton text="continue_with" />)

    expect(screen.getByText('Continuar con Google')).toBeInTheDocument()
  })

  it('debería llamar onClick cuando se hace click', () => {
    const mockClick = jest.fn()
    render(<GoogleSignInButton onClick={mockClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('debería estar deshabilitado cuando disabled=true', () => {
    const mockClick = jest.fn()
    render(<GoogleSignInButton onClick={mockClick} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('debería tener el icono de Google', () => {
    render(<GoogleSignInButton />)

    const svgIcon = screen.getByRole('button').querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveAttribute('viewBox', '0 0 48 48')
    expect(svgIcon).toHaveAttribute('version', '1.1')
  })

  it('debería aplicar className personalizada', () => {
    render(<GoogleSignInButton className="custom-class" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('gsi-material-button')
  })

  it('debería tener accesibilidad correcta', () => {
    render(<GoogleSignInButton />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('tabIndex', '0')
  })
})

describe('GoogleSignInButtonOfficial', () => {
  it('debería renderizar con el texto por defecto', () => {
    render(<GoogleSignInButtonOfficial />)

    expect(screen.getByText('Continuar con Google')).toBeInTheDocument()
    expect(screen.getByRole('button')).toBeInTheDocument()
  })

  it('debería tener la estructura correcta de Google oficial', () => {
    render(<GoogleSignInButtonOfficial />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('gsi-material-button')
    expect(button.querySelector('.gsi-material-button-state')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-content-wrapper')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-icon')).toBeInTheDocument()
    expect(button.querySelector('.gsi-material-button-contents')).toBeInTheDocument()
  })

  it('debería renderizar con diferentes textos', () => {
    render(<GoogleSignInButtonOfficial text="signin_with" />)

    expect(screen.getByText('Acceder con Google')).toBeInTheDocument()
  })

  it('debería llamar onClick cuando se hace click', () => {
    const mockClick = jest.fn()
    render(<GoogleSignInButtonOfficial onClick={mockClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('debería estar deshabilitado cuando disabled=true', () => {
    const mockClick = jest.fn()
    render(<GoogleSignInButtonOfficial onClick={mockClick} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('debería tener el icono de Google oficial', () => {
    render(<GoogleSignInButtonOfficial />)

    const svgIcon = screen.getByRole('button').querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveAttribute('viewBox', '0 0 48 48')
    expect(svgIcon).toHaveAttribute('version', '1.1')
  })

  it('debería aplicar className personalizada', () => {
    render(<GoogleSignInButtonOfficial className="custom-class" />)

    const button = screen.getByRole('button')
    expect(button).toHaveClass('custom-class')
    expect(button).toHaveClass('gsi-material-button')
  })
})
