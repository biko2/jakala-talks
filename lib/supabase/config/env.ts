function getSupabaseUrl(): string {
  // En el cliente, solo podemos acceder a NEXT_PUBLIC_*
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!
  }

  // En el servidor, preferimos las variables sin prefijo en producción
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return process.env.NEXT_PUBLIC_SUPABASE_URL!
  }

  // En producción del servidor, usar la variable sin prefijo si existe, sino la pública
  return process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL!
}

function getSupabaseAnonKey(): string {
  // En el cliente, solo podemos acceder a NEXT_PUBLIC_*
  if (typeof window !== 'undefined') {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  // En el servidor, preferimos las variables sin prefijo en producción
  const isDevelopment = process.env.NODE_ENV === 'development'

  if (isDevelopment) {
    return process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  }

  // En producción del servidor, usar la variable sin prefijo si existe, sino la pública
  return process.env.SUPABASE_ANON_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
}

export { getSupabaseUrl, getSupabaseAnonKey }
