import { render, screen } from '@testing-library/react'
import TalksList from '../TalksList'
import { Talk } from '@/src/domain/entities/Talk'

const mockTalks = [
  new Talk('1', 'Charla 1', 'Descripción 1', 'Autor 1'),
  new Talk('2', 'Charla 2', 'Descripción 2', 'Autor 2')
]

describe('TalksList', () => {
  it('debería renderizar el título de la sección', () => {
    render(<TalksList talks={mockTalks} />)

    expect(screen.getByText('Todas las charlas')).toBeInTheDocument()
  })

  it('debería renderizar todas las charlas', () => {
    render(<TalksList talks={mockTalks} />)

    expect(screen.getByText('Charla 1')).toBeInTheDocument()
    expect(screen.getByText('Charla 2')).toBeInTheDocument()
    expect(screen.getByText('Autor 1')).toBeInTheDocument()
    expect(screen.getByText('Autor 2')).toBeInTheDocument()
  })

  it('debería pasar las props correctas a TalkCard', () => {
    const mockOnVote = jest.fn()
    render(
      <TalksList
        talks={mockTalks}
        onVote={mockOnVote}
        isLoggedIn={true}
      />
    )

    expect(screen.getAllByText('❤️')).toHaveLength(2)
  })

  it('debería renderizar lista vacía sin errores', () => {
    render(<TalksList talks={[]} />)

    expect(screen.getByText('Todas las charlas')).toBeInTheDocument()
    expect(screen.queryByText('Charla 1')).not.toBeInTheDocument()
  })
})
