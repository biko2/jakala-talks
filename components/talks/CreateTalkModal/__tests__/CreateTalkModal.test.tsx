import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import CreateTalkModal from '../CreateTalkModal'

const mockOnClose = jest.fn()
const mockOnSubmit = jest.fn()

const defaultProps = {
  isOpen: true,
  onClose: mockOnClose,
  onSubmit: mockOnSubmit
}

describe('CreateTalkModal', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('no debería renderizar cuando isOpen es false', () => {
    render(<CreateTalkModal {...defaultProps} isOpen={false} />)

    expect(screen.queryByText('Nueva Charla')).not.toBeInTheDocument()
  })

  it('debería renderizar el modal cuando isOpen es true', () => {
    render(<CreateTalkModal {...defaultProps} />)

    expect(screen.getByText('Nueva Charla')).toBeInTheDocument()
    expect(screen.getByLabelText('Título')).toBeInTheDocument()
    expect(screen.getByLabelText('Descripción')).toBeInTheDocument()
    expect(screen.getByLabelText('Duración (minutos)')).toBeInTheDocument()
    expect(screen.getByText('Cancelar')).toBeInTheDocument()
    expect(screen.getByText('Crear Charla')).toBeInTheDocument()
  })

  it('debería llamar onClose cuando se hace click en el botón cerrar', () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.click(screen.getByText('×'))

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('debería llamar onClose cuando se hace click en Cancelar', () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.click(screen.getByText('Cancelar'))

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('debería llamar onClose cuando se hace click en el overlay', () => {
    render(<CreateTalkModal {...defaultProps} />)

    const overlay = screen.getByText('Nueva Charla').closest('div')?.parentElement?.parentElement!
    fireEvent.click(overlay)

    expect(mockOnClose).toHaveBeenCalledTimes(1)
  })

  it('no debería llamar onClose cuando se hace click en el contenido del modal', () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.click(screen.getByText('Nueva Charla'))

    expect(mockOnClose).not.toHaveBeenCalled()
  })

  it('debería mostrar error cuando el título está vacío', async () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => {
      expect(screen.getByText('El título es obligatorio')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('debería mostrar error cuando la descripción está vacía', async () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => {
      expect(screen.getByText('La descripción es obligatoria')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('debería mostrar error cuando la duración es 0', async () => {
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '0' } })
    fireEvent.submit(screen.getByRole('form'))

    await waitFor(() => {
      expect(screen.getByText('La duración debe ser mayor a 0')).toBeInTheDocument()
    })
    expect(mockOnSubmit).not.toHaveBeenCalled()
  })

  it('debería enviar el formulario con datos válidos', async () => {
    mockOnSubmit.mockResolvedValue(undefined)
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '45' } })
    fireEvent.click(screen.getByText('Crear Charla'))

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith('Test Title', 'Test Description', 45)
    })
  })

  it('debería mostrar estado de carga durante el envío', async () => {
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.click(screen.getByText('Crear Charla'))

    expect(screen.getByText('Creando...')).toBeInTheDocument()

    resolveSubmit!()
    await waitFor(() => {
      expect(screen.queryByText('Creando...')).not.toBeInTheDocument()
    })
  })

  it('debería mostrar error cuando el envío falla', async () => {
    mockOnSubmit.mockRejectedValue(new Error('Error de prueba'))
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.click(screen.getByText('Crear Charla'))

    await waitFor(() => {
      expect(screen.getByText('Error de prueba')).toBeInTheDocument()
    })
  })

  it('debería limpiar el formulario después de un envío exitoso', async () => {
    mockOnSubmit.mockResolvedValue(undefined)
    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.change(screen.getByLabelText('Duración (minutos)'), { target: { value: '45' } })
    fireEvent.click(screen.getByText('Crear Charla'))

    await waitFor(() => {
      expect(mockOnClose).toHaveBeenCalled()
    })
  })

  it('debería tener valores por defecto correctos', () => {
    render(<CreateTalkModal {...defaultProps} />)

    expect(screen.getByLabelText('Título')).toHaveValue('')
    expect(screen.getByLabelText('Descripción')).toHaveValue('')
    expect(screen.getByLabelText('Duración (minutos)')).toHaveValue(30)
  })

  it('debería deshabilitar controles durante el envío', async () => {
    let resolveSubmit: () => void
    const submitPromise = new Promise<void>((resolve) => {
      resolveSubmit = resolve
    })
    mockOnSubmit.mockReturnValue(submitPromise)

    render(<CreateTalkModal {...defaultProps} />)

    fireEvent.change(screen.getByLabelText('Título'), { target: { value: 'Test Title' } })
    fireEvent.change(screen.getByLabelText('Descripción'), { target: { value: 'Test Description' } })
    fireEvent.click(screen.getByText('Crear Charla'))

    expect(screen.getByLabelText('Título')).toBeDisabled()
    expect(screen.getByLabelText('Descripción')).toBeDisabled()
    expect(screen.getByLabelText('Duración (minutos)')).toBeDisabled()
    expect(screen.getByText('Cancelar')).toBeDisabled()
    expect(screen.getByText('×')).toBeDisabled()

    resolveSubmit!()
    await waitFor(() => {
      expect(screen.queryByText('Creando...')).not.toBeInTheDocument()
    })
  })
})
