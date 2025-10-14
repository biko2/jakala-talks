import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react'
import NewTalk from '../NewTalk'

describe('NewTalk', () => {
  it('debería renderizar correctamente con el texto proporcionado', () => {
    render(<NewTalk onClick={() => { }}>Test Button</NewTalk>)

    expect(screen.getByRole('button', { name: 'Test Button' })).toBeInTheDocument()
  })

  it('debería ejecutar onClick cuando se hace clic', () => {
    const handleClick = jest.fn()
    render(<NewTalk onClick={handleClick}>Click me</NewTalk>)

    fireEvent.click(screen.getByRole('button'))

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('debería estar deshabilitado cuando disabled es true', () => {
    const handleClick = jest.fn()
    render(
      <NewTalk onClick={handleClick} disabled>
        Disabled Button
      </NewTalk>
    )

    const button = screen.getByRole('button')
    expect(button).toBeDisabled()

    fireEvent.click(button)
    expect(handleClick).not.toHaveBeenCalled()
  })

  it('debería tener el tipo correcto por defecto', () => {
    render(<NewTalk onClick={() => { }}>Button</NewTalk>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'button')
  })

  it('debería permitir cambiar el tipo de botón', () => {
    render(<NewTalk onClick={() => { }} type="submit">Submit</NewTalk>)

    expect(screen.getByRole('button')).toHaveAttribute('type', 'submit')
  })

  it('debería tener aria-label cuando se proporciona', () => {
    render(<NewTalk onClick={() => { }} ariaLabel="Nueva charla">+</NewTalk>)

    expect(screen.getByRole('button', { name: 'Nueva charla' })).toBeInTheDocument()
  })
})
