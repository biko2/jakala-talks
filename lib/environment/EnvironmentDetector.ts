export class EnvironmentDetector {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  static isMswEnabled(): boolean {
    return this.isDevelopment() && process.env.NEXT_PUBLIC_USE_SUPABASE !== 'true'
  }

  static isLocalWithSupabase(): boolean {
    return this.isDevelopment() && process.env.NEXT_PUBLIC_USE_SUPABASE === 'true'
  }

  static getEnvironmentType(): 'msw' | 'local-supabase' | 'production' {
    if (this.isMswEnabled()) return 'msw'
    if (this.isLocalWithSupabase()) return 'local-supabase'
    return 'production'
  }
}
