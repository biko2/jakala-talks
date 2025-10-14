import { render, screen } from '@testing-library/react'
import TalksList from '../TalksList'
import { Talk } from '@/src/domain/entities/Talk'

jest.mock('@/components/talks/TalkCard', () => ({
  __esModule: true,
  default: function MockTalkCard({ talk, isLoggedIn }: any) {
    return (
      <div>
        <h2>{talk.title}</h2>
        <p>{talk.description}</p>
        <span>{talk.author}</span>
        <span>{talk.duration} min</span>
        {isLoggedIn && <span>❤️</span>}
      </div>
    )
  }
}))

const mockTalks = [
  new Talk('1', 'Charla 1', 'Descripción 1', 'Autor 1', 30),
  new Talk('2', 'Charla 2', 'Descripción 2', 'Autor 2', 45)
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

  it('debería mostrar estado de votación cuando el usuario está logueado', () => {
    const userVotes = ['1']
    render(
      <TalksList
        talks={mockTalks}
        isLoggedIn={true}
        userVotes={userVotes}
      />
    )

    expect(screen.getByText('Has votado 1 de 3 charlas (2 votos restantes)')).toBeInTheDocument()
  })

  it('debería mostrar estado de votación sin votos restantes cuando se alcanza el límite', () => {
    const userVotes = ['1', '2', '3']
    render(
      <TalksList
        talks={mockTalks}
        isLoggedIn={true}
        userVotes={userVotes}
      />
    )

    expect(screen.getByText('Has votado 3 de 3 charlas')).toBeInTheDocument()
  })

  it('no debería mostrar estado de votación cuando el usuario no está logueado', () => {
    render(<TalksList talks={mockTalks} isLoggedIn={false} />)

    expect(screen.queryByText(/Has votado/)).not.toBeInTheDocument()
  })

  it('debería mostrar mensaje de votación no disponible cuando no está habilitada', () => {
    render(
      <TalksList
        talks={mockTalks}
        isLoggedIn={true}
        userVotes={[]}
        isVotingEnabled={false}
        votingStatusMessage="La votación estára habilitada el 7 de Noviembre"
      />
    )

    expect(screen.getByText('La votación estára habilitada el 7 de Noviembre')).toBeInTheDocument()
  })

  it('debería pasar userVotes correctamente a los componentes TalkCard', () => {
    const userVotes = ['1']
    const mockOnVote = jest.fn()

    render(
      <TalksList
        talks={mockTalks}
        onVote={mockOnVote}
        isLoggedIn={true}
        userVotes={userVotes}
      />
    )

    expect(screen.getByText('Charla 1')).toBeInTheDocument()
    expect(screen.getByText('Charla 2')).toBeInTheDocument()
  })

  it('debería renderizar lista vacía sin errores', () => {
    render(<TalksList talks={[]} />)

    expect(screen.getByText('Todas las charlas')).toBeInTheDocument()
    expect(screen.queryByText('Charla 1')).not.toBeInTheDocument()
  })
})
