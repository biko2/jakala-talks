import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { MockTalkRepository } from '@/lib/mock/TalkRepository'
import { EnvironmentDetector } from '@/lib/environment/EnvironmentDetector'
import { createBrowserClient } from '@/lib/supabase/client'

export class TalkRepositoryFactory {
  static create(): ITalkRepository {
    const environmentType = EnvironmentDetector.getEnvironmentType()

    switch (environmentType) {
      case 'mock':
        return new MockTalkRepository()

      case 'local-supabase':
      case 'production':
        const supabase = createBrowserClient()
        return new TalkRepository(supabase)

      default:
        throw new Error(`Entorno no soportado: ${environmentType}`)
    }
  }

  static createForTesting(): ITalkRepository {
    return new MockTalkRepository()
  }
}
