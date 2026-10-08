'use client'

import { ReactNode, useEffect, useState } from 'react'
import { createBrowserClient } from '@/lib/supabase/client'
import { createMswSession } from '@/src/infrastructure/msw/authUser'
import { LoadingScreen } from './MswBoot.styles'

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
      const session = createMswSession()
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
    return <LoadingScreen>Cargando...</LoadingScreen>
  }

  return children
}
