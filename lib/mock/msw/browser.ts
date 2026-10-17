import { setupWorker } from 'msw/browser'
import { handlers } from './handlers'

export const worker = setupWorker(...handlers)

let workerStart: Promise<unknown> | undefined

export function startWorker(): Promise<unknown> {
  workerStart ??= worker.start({ onUnhandledRequest: 'bypass' })
  return workerStart
}
