import { setupWorker } from '../../../node_modules/msw/lib/browser/index.mjs'
import { handlers } from './handlers'
import { seedMockSession } from './sessionStorage'

export async function startBrowserWorker(): Promise<void> {
  seedMockSession()
  const worker = setupWorker(...handlers)
  await worker.start({
    onUnhandledRequest: 'bypass',
    quiet: true,
    serviceWorker: {
      url: '/mockServiceWorker.js',
    },
  })
}
