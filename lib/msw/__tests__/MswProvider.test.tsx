import { render, screen } from '@testing-library/react'
import { MswProvider } from '../MswProvider'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

jest.mock('@/lib/environment/EnvironmentDetector', () => ({
  EnvironmentDetector: {
    isMswEnabled: jest.fn()
  }
}))

jest.mock('../MswBoot', () => ({
  __esModule: true,
  default: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="msw-boot">{children}</div>
  )
}))

const isMswEnabled = EnvironmentDetector.isMswEnabled as jest.MockedFunction<
  typeof EnvironmentDetector.isMswEnabled
>

describe('MswProvider', () => {
  it('debería renderizar hijos sin boot cuando MSW está apagado', () => {
    isMswEnabled.mockReturnValue(false)

    render(
      <MswProvider>
        <p>home</p>
      </MswProvider>
    )

    expect(screen.getByText('home')).toBeInTheDocument()
    expect(screen.queryByTestId('msw-boot')).not.toBeInTheDocument()
  })
})
