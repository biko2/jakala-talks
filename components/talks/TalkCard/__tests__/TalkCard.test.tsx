import { render, screen, fireEvent } from '@testing-library/react'
import TalkCard from '../TalkCard'
import { Talk } from '@/src/domain/entities/Talk'

const mockTalk = new Talk(
  '1',
  'Arquitectura Hexagonal',
  'Una descripción sobre arquitectura hexagonal',
  'Diego Rodríguez'
)

describe('TalkCard', () => {
  it('debería renderizar la información de la charla', () => {
    render(<TalkCard talk={mockTalk} />)

    expect(screen.getByText('Arquitectura Hexagonal')).toBeInTheDocument()
    expect(screen.getByText('Una descripción sobre arquitectura hexagonal')).toBeInTheDocument()
    expect(screen.getByText('Diego Rodríguez')).toBeInTheDocument()
  })

  it('no debería mostrar el ícono de voto cuando no está logeado', () => {
    render(<TalkCard talk={mockTalk} isLoggedIn={false} />)

    expect(screen.queryByText('❤️')).not.toBeInTheDocument()
  })

  it('debería mostrar el ícono de voto cuando está logeado', () => {
    render(<TalkCard talk={mockTalk} isLoggedIn={true} />)

    expect(screen.getByText('❤️')).toBeInTheDocument()
  })

  it('debería llamar onVote cuando se hace click y está logeado', () => {
    const mockOnVote = jest.fn()
    render(
      <TalkCard
        talk={mockTalk}
        isLoggedIn={true}
        onVote={mockOnVote}
      />
    )

    fireEvent.click(screen.getByText('Arquitectura Hexagonal'))

    expect(mockOnVote).toHaveBeenCalledWith('1', true)
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

    fireEvent.click(screen.getByText('Arquitectura Hexagonal'))

    expect(mockOnVote).not.toHaveBeenCalled()
  })

  it('debería alternar el voto cuando se hace click', () => {
    const votedTalk = mockTalk.vote()
    const mockOnVote = jest.fn()

    render(
      <TalkCard
        talk={votedTalk}
        isLoggedIn={true}
        onVote={mockOnVote}
      />
    )

    fireEvent.click(screen.getByText('Arquitectura Hexagonal'))

    expect(mockOnVote).toHaveBeenCalledWith('1', false)
  })
})
