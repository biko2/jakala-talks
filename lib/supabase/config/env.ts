function getSupabaseUrl(): string {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!
  }

  return process.env.SUPABASE_URL!
}

function getSupabaseAnonKey(): string {
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  return process.env.SUPABASE_ANON_KEY!
}

export { getSupabaseUrl, getSupabaseAnonKey }
