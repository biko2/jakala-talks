'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

interface MSWProviderProps {
  children: ReactNode
}

export default function MSWProvider({ children }: MSWProviderProps) {
  const [isReady, setIsReady] = useState(() => !EnvironmentDetector.isApiMockingEnabled())

  useEffect(() => {
    // Comparación literal de NODE_ENV: permite a Next eliminar el chunk de MSW del bundle de producción.
    if (isReady || process.env.NODE_ENV !== 'development') return

    let cancelled = false
    import('@/lib/mock/msw/browser')
      .then(({ startWorker }) => startWorker())
      .catch(error => {
        console.error('No se pudo arrancar Mock Service Worker:', error)
      })
      .finally(() => {
        if (!cancelled) setIsReady(true)
      })

    return () => {
      cancelled = true
    }
  }, [isReady])

  return isReady ? <>{children}</> : null
}
