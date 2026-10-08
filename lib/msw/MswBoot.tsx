'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { createMockSession } from '@/src/infrastructure/msw/authUser'

type MswBootProps = {
  children: ReactNode
}

export default function MswBoot({ children }: MswBootProps) {
  const [ready, setReady] = useState(false)

  useEffect(() => {
    let cancelled = false

    const start = async () => {
      const { startBrowserMsw } = await import('./startBrowserMsw')
      await startBrowserMsw()

      const supabase = createBrowserClient()
      const session = createMockSession()
      await supabase.auth.setSession({
        access_token: session.access_token,
        refresh_token: session.refresh_token
      })
    }

    void start().finally(() => {
      if (!cancelled) {
        setReady(true)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  if (!ready) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f9fafb'
      }}>
        Cargando...
      </div>
    )
  }

  return children
}
