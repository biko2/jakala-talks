'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

interface MSWProviderProps {
  children: ReactNode
}

export default function MSWProvider({ children }: MSWProviderProps) {
  const [isReady, setIsReady] = useState(() => !EnvironmentDetector.isApiMockingEnabled())

  useEffect(() => {
    if (isReady) return

    let cancelled = false
    import('@/lib/mock/msw/browser')
      .then(({ startWorker }) => startWorker())
      .then(() => {
        if (!cancelled) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [isReady])

  return isReady ? <>{children}</> : null
}
