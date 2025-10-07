export class EnvironmentDetector {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  static isMockMode(): boolean {
    return this.isDevelopment() && process.env.NEXT_PUBLIC_USE_MOCK_USER === 'true'
  }

  static isLocalWithSupabase(): boolean {
    return this.isDevelopment() && !this.isMockMode()
  }

  static getEnvironmentType(): 'mock' | 'local-supabase' | 'production' {
    if (this.isMockMode()) return 'mock'
    if (this.isLocalWithSupabase()) return 'local-supabase'
    return 'production'
  }
}
