import { createMockSession } from './fixture/session'
import { getSupabaseUrl } from '@/lib/supabase/config/env'

export function seedMockSession(): void {
  if (typeof window === 'undefined') {
    return
  }

  const supabaseUrl = getSupabaseUrl()
  const projectRef = new URL(supabaseUrl).hostname.split('.')[0]
  const session = createMockSession()
  const serialized = JSON.stringify(session)
  const storageKey = `sb-${projectRef}-auth-token`

  window.localStorage.setItem(storageKey, serialized)
  document.cookie = `${storageKey}=${encodeURIComponent(serialized)}; path=/; SameSite=Lax; max-age=31536000`
}
