import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'
import { createBrowserClient } from '@/lib/supabase/client'

export class TalkRepositoryFactory {
  static create(): ITalkRepository {
    const supabase = createBrowserClient()
    return new TalkRepository(supabase)
  }

  static createForTesting(): ITalkRepository {
    return new InMemoryTalkRepository()
  }
}
