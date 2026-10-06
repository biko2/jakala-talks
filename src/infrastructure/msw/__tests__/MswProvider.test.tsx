import { render, screen } from '@testing-library/react'
import { MswProvider } from '../MswProvider'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

describe('MswProvider', () => {
  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('renderiza children de inmediato cuando MSW está apagado', () => {
    jest.spyOn(EnvironmentDetector, 'isMswEnabled').mockReturnValue(false)

    render(
      <MswProvider>
        <p>listo</p>
      </MswProvider>
    )

    expect(screen.getByText('listo')).toBeInTheDocument()
  })
})
