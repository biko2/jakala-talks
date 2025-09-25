import { render, screen, fireEvent } from '@testing-library/react'
import GoogleIcon from '../GoogleIcon'

describe('GoogleIcon', () => {
  it('debería renderizar el icono de Google', () => {
    render(<GoogleIcon />)

    const button = screen.getByRole('button')
    expect(button).toBeInTheDocument()

    const svgIcon = button.querySelector('svg')
    expect(svgIcon).toBeInTheDocument()
    expect(svgIcon).toHaveAttribute('width', '18')
    expect(svgIcon).toHaveAttribute('height', '18')
  })

  it('debería tener aria-label correcto', () => {
    render(<GoogleIcon />)

    expect(screen.getByRole('button')).toHaveAttribute('aria-label', 'Acceder con Google')
  })

  it('debería llamar onClick cuando se hace click', () => {
    const mockClick = jest.fn()
    render(<GoogleIcon onClick={mockClick} />)

    fireEvent.click(screen.getByRole('button'))

    expect(mockClick).toHaveBeenCalledTimes(1)
  })

  it('debería estar deshabilitado cuando disabled=true', () => {
    const mockClick = jest.fn()
    render(<GoogleIcon onClick={mockClick} disabled={true} />)

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(mockClick).not.toHaveBeenCalled()
  })

  it('debería aplicar className personalizada', () => {
    render(<GoogleIcon className="custom-icon-class" />)

    expect(screen.getByRole('button')).toHaveClass('custom-icon-class')
  })

  it('debería tener accesibilidad correcta', () => {
    render(<GoogleIcon />)

    const button = screen.getByRole('button')
    expect(button).toHaveAttribute('tabIndex', '0')
    expect(button).toHaveAttribute('role', 'button')
  })

  it('debería contener todos los paths del logo de Google', () => {
    render(<GoogleIcon />)

    const button = screen.getByRole('button')
    const svgIcon = button.querySelector('svg')
    const paths = svgIcon?.querySelectorAll('path')

    expect(paths).toHaveLength(4)

    // Verificar que contiene los colores característicos de Google
    const colors = Array.from(paths || []).map(path => path.getAttribute('fill'))
    expect(colors).toContain('#4285F4') // Google Blue
    expect(colors).toContain('#34A853') // Google Green
    expect(colors).toContain('#FBBC04') // Google Yellow
    expect(colors).toContain('#EA4335') // Google Red
  })
})
