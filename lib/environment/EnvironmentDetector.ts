export class EnvironmentDetector {
  static isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development'
  }

  static isProduction(): boolean {
    return process.env.NODE_ENV === 'production'
  }

  static isApiMockingEnabled(): boolean {
    return this.isDevelopment() && process.env.NEXT_PUBLIC_API_MOCKING !== 'disabled'
  }
}
