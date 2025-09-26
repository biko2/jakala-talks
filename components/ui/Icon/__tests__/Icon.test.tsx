import { render, screen, fireEvent } from '@testing-library/react'
import { Plus, Search } from 'lucide-react'
import Icon from '../Icon'

describe('Icon', () => {
  it('should render the icon component correctly', () => {
    const { container } = render(<Icon icon={Plus} />)

    const svgElement = container.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })

  it('should render with custom size', () => {
    const { container } = render(<Icon icon={Plus} size={32} />)

    const svgElement = container.querySelector('svg')
    expect(svgElement).toHaveAttribute('width', '32')
    expect(svgElement).toHaveAttribute('height', '32')
  })

  it('should render with custom color', () => {
    const { container } = render(<Icon icon={Plus} color="red" />)

    const svgElement = container.querySelector('svg')
    expect(svgElement).toHaveAttribute('stroke', 'red')
  })

  it('should render with custom strokeWidth', () => {
    const { container } = render(<Icon icon={Plus} strokeWidth={3} />)

    const svgElement = container.querySelector('svg')
    expect(svgElement).toHaveAttribute('stroke-width', '3')
  })

  it('should handle click events when onClick is provided', () => {
    const handleClick = jest.fn()
    render(<Icon icon={Plus} onClick={handleClick} />)

    const iconContainer = screen.getByRole('button')
    fireEvent.click(iconContainer)

    expect(handleClick).toHaveBeenCalledTimes(1)
  })

  it('should apply custom className', () => {
    render(<Icon icon={Plus} className="custom-class" />)

    const iconContainer = screen.getByTestId('icon-container')
    expect(iconContainer).toHaveClass('custom-class')
  })

  it('should render different icons correctly', () => {
    const { rerender, container } = render(<Icon icon={Plus} />)

    let svgElement = container.querySelector('svg')
    expect(svgElement).toBeInTheDocument()

    rerender(<Icon icon={Search} />)

    svgElement = container.querySelector('svg')
    expect(svgElement).toBeInTheDocument()
  })
})
