import { render, screen, fireEvent } from '@testing-library/react'
import TalkCard from '../TalkCard'
import { Talk } from '@/src/domain/entities/Talk'

const mockTalk = new Talk(
  '1',
  'Arquitectura Hexagonal',
  'Una descripción sobre arquitectura hexagonal',
  'Diego Rodríguez',
  45,
  5
)

describe('TalkCard', () => {
  it('debería renderizar la información de la charla', () => {
    render(<TalkCard talk={mockTalk} />)

    expect(screen.getByText('Arquitectura Hexagonal')).toBeInTheDocument()
    expect(screen.getByText('Una descripción sobre arquitectura hexagonal')).toBeInTheDocument()
    expect(screen.getByText('Diego Rodríguez')).toBeInTheDocument()
    expect(screen.getByText('45 min')).toBeInTheDocument()
  })

  it('no debería mostrar el ícono de voto cuando no está logeado', () => {
    render(<TalkCard talk={mockTalk} isLoggedIn={false} />)

    // Solo debería mostrar 2 iconos (User y Clock), no el de Heart (voto)
    expect(screen.getAllByTestId('icon-container')).toHaveLength(2)
  })

  it('debería mostrar el ícono de voto cuando está logeado', () => {
    render(<TalkCard talk={mockTalk} isLoggedIn={true} />)

    expect(screen.getAllByTestId('icon-container')).toHaveLength(3)
  })

  it('debería mostrar el número de votos', () => {
    render(<TalkCard talk={mockTalk} />)

    expect(screen.getByText('5')).toBeInTheDocument()
  })

  it('debería llamar onVote cuando se hace click y está logeado', () => {
    const mockOnVote = jest.fn()
    render(
      <TalkCard
        talk={mockTalk}
        isLoggedIn={true}
        onVote={mockOnVote}
        isVoted={false}
      />
    )

    const talkContainer = screen.getByText('Arquitectura Hexagonal').closest('div')
    fireEvent.click(talkContainer!)

    expect(mockOnVote).toHaveBeenCalledWith('1')
  })

  it('no debería llamar onVote cuando no está logeado', () => {
    const mockOnVote = jest.fn()
    render(
      <TalkCard
        talk={mockTalk}
        isLoggedIn={false}
        onVote={mockOnVote}
      />
    )

    // No debería haber ícono de voto cuando no está logeado (solo iconos de autor y duración)
    expect(screen.getAllByTestId('icon-container')).toHaveLength(2)
    expect(mockOnVote).not.toHaveBeenCalled()
  })
})
