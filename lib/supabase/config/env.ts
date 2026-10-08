import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'

const isClient = typeof window !== 'undefined'
const isDevelopment = process.env.NODE_ENV === 'development'

const MSW_PLACEHOLDER_URL = 'https://msw.supabase.local'
const MSW_PLACEHOLDER_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJvbGUiOiJhbm9uIiwiaWF0IjoxLCJleHAiOjk5OTk5OTk5OTl9.msw'

function placeholderIfMsw(value: string | undefined, placeholder: string): string | undefined {
  if (value) {
    return value
  }
  if (EnvironmentDetector.isMswEnabled()) {
    return placeholder
  }
  return undefined
}

function getSupabaseUrl(): string {
  if (isClient) {
    const url = placeholderIfMsw(process.env.NEXT_PUBLIC_SUPABASE_URL, MSW_PLACEHOLDER_URL)
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada')
    }
    return url
  }

  if (isDevelopment) {
    const url = placeholderIfMsw(process.env.NEXT_PUBLIC_SUPABASE_URL, MSW_PLACEHOLDER_URL)
    if (!url) {
      throw new Error('NEXT_PUBLIC_SUPABASE_URL no está configurada para desarrollo')
    }
    return url
  }

  const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL
  if (!url) {
    throw new Error('SUPABASE_URL o NEXT_PUBLIC_SUPABASE_URL debe estar configurada en producción')
  }
  return url
}

function getSupabaseAnonKey(): string {
  if (isClient) {
    const key = placeholderIfMsw(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, MSW_PLACEHOLDER_ANON_KEY)
    if (!key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada')
    }
    return key
  }

  if (isDevelopment) {
    const key = placeholderIfMsw(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, MSW_PLACEHOLDER_ANON_KEY)
    if (!key) {
      throw new Error('NEXT_PUBLIC_SUPABASE_ANON_KEY no está configurada para desarrollo')
    }
    return key
  }

  const key = process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  if (!key) {
    throw new Error('SUPABASE_ANON_KEY o NEXT_PUBLIC_SUPABASE_ANON_KEY debe estar configurada en producción')
  }
  return key
}

function getAppUrl(): string {
  if (isClient && typeof window !== 'undefined') {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.NEXTAUTH_URL
    if (appUrl) {
      return appUrl
    }
    return window.location.origin
  }

  if (isDevelopment) {
    return process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  }

  const appUrl = process.env.NEXTAUTH_URL || process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL
  if (!appUrl) {
    throw new Error('NEXTAUTH_URL o NEXT_PUBLIC_APP_URL debe estar configurada en producción')
  }

  return appUrl.startsWith('http') ? appUrl : `https://${appUrl}`
}

export { getSupabaseUrl, getSupabaseAnonKey, getAppUrl }
