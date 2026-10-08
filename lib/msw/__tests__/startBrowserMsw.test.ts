const mockStart = jest.fn().mockResolvedValue(undefined)
const resetStore = jest.fn()

jest.mock('../setupWorker', () => ({
  setupWorker: () => ({
    start: (...args: unknown[]) => mockStart(...args)
  })
}))

jest.mock('@/src/infrastructure/msw/store', () => ({
  resetStore: () => resetStore()
}))

jest.mock('@/src/infrastructure/msw/handlers', () => ({
  handlers: []
}))

describe('startBrowserMsw', () => {
  it('debería resetear el store solo en el primer arranque', async () => {
    const { startBrowserMsw } = await import('../startBrowserMsw')

    await startBrowserMsw()
    await startBrowserMsw()

    expect(resetStore).toHaveBeenCalledTimes(1)
    expect(mockStart).toHaveBeenCalledTimes(1)
  })
})
