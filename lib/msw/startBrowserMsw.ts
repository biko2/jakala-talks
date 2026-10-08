import { handlers } from '@/src/infrastructure/msw/handlers'
import { resetStore } from '@/src/infrastructure/msw/store'
import { setupWorker } from './setupWorker'

const worker = setupWorker(...handlers)

export async function startBrowserMsw(): Promise<void> {
  resetStore()
  await worker.start({
    onUnhandledRequest: 'bypass',
    serviceWorker: {
      url: '/mockServiceWorker.js'
    }
  })
}
