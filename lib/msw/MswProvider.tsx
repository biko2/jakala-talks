'use client'

import dynamic from 'next/dynamic'
import { ReactNode } from 'react'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

const MswBoot = dynamic(() => import('./MswBoot'), { ssr: false })

type MswProviderProps = {
  children: ReactNode
}

export function MswProvider({ children }: MswProviderProps) {
  if (!EnvironmentDetector.isMswEnabled()) {
    return children
  }

  return <MswBoot>{children}</MswBoot>
}
