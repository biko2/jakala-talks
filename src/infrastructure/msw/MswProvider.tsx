'use client'

import { useEffect, useState } from 'react'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

export function MswProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(!EnvironmentDetector.isMswEnabled())

  useEffect(() => {
    if (!EnvironmentDetector.isMswEnabled()) {
      return
    }

    let cancelled = false

    const start = async () => {
      try {
        const { startBrowserWorker } = await import('./browser')
        await startBrowserWorker()
      } finally {
        if (!cancelled) {
          setReady(true)
        }
      }
    }

    start()

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return null
  }

  return children
}
