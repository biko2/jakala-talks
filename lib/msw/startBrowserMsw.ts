import { handlers } from '@/src/infrastructure/msw/handlers'
import { resetStore } from '@/src/infrastructure/msw/store'
import { setupWorker } from './setupWorker'

const worker = setupWorker(...handlers)

let startPromise: Promise<void> | null = null

export async function startBrowserMsw(): Promise<void> {
  if (!startPromise) {
    startPromise = (async () => {
      resetStore()
      await worker.start({
        onUnhandledRequest: 'bypass',
        serviceWorker: {
          url: '/mockServiceWorker.js'
        }
      })
    })()
  }

  return startPromise
}
