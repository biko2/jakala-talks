import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { InMemoryTalkRepository } from '@/src/infrastructure/adapters/InMemoryTalkRepository'
import { createBrowserClient } from '@/lib/supabase/client'

export class TalkRepositoryFactory {
  static create(): ITalkRepository {
    return new TalkRepository(createBrowserClient())
  }

  static createForTesting(): ITalkRepository {
    return new InMemoryTalkRepository()
  }
}
