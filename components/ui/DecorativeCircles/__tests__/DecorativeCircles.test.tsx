import { render } from '@testing-library/react'
import DecorativeCircles from '../DecorativeCircles'

describe('DecorativeCircles', () => {
  it('debería renderizar el número correcto de círculos', () => {
    const { container } = render(<DecorativeCircles count={5} />)
    const circles = container.querySelectorAll('div')
    expect(circles).toHaveLength(5)
  })

  it('debería usar valores por defecto cuando no se proporcionan props', () => {
    const { container } = render(<DecorativeCircles />)
    const circles = container.querySelectorAll('div')
    expect(circles).toHaveLength(8)
  })

  it('debería renderizar círculos con diferentes props', () => {
    const { container } = render(
      <DecorativeCircles
        count={3}
        primaryColor="#ff0000"
        secondaryColor="#00ff00"
      />
    )
    const circles = container.querySelectorAll('div')
    expect(circles).toHaveLength(3)
  })

  it('debería generar círculos únicos en cada renderizado', () => {
    const { container: container1 } = render(<DecorativeCircles count={2} />)
    const { container: container2 } = render(<DecorativeCircles count={2} />)

    const circles1 = container1.querySelectorAll('div')
    const circles2 = container2.querySelectorAll('div')

    expect(circles1).toHaveLength(2)
    expect(circles2).toHaveLength(2)
  })

  it('debería usar el mismo tamaño para todos los círculos', () => {
    const { container } = render(<DecorativeCircles count={3} />)
    const circles = container.querySelectorAll('div')
    expect(circles).toHaveLength(3)
  })
})