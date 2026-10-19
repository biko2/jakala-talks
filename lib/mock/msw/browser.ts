import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'
import { MOCK_SUPABASE_URL } from './constants'

export const worker = setupWorker(...handlers)

const MOCK_SUPABASE_ORIGIN = new URL(MOCK_SUPABASE_URL).origin

let workerStart: Promise<unknown> | undefined

export function startWorker(): Promise<unknown> {
  workerStart ??= worker.start({
    onUnhandledRequest(request, print) {
      if (new URL(request.url).origin === MOCK_SUPABASE_ORIGIN) print.warning()
    },
  })
  return workerStart
}
