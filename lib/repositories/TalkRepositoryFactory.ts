import { ITalkRepository } from '@/src/domain/ports/TalkRepository'
import { TalkRepository } from '@/src/infrastructure/adapters/TalkRepository'
import { createBrowserClient } from '@/lib/supabase/client'

export class TalkRepositoryFactory {
  static create(): ITalkRepository {
    return new TalkRepository(createBrowserClient())
  }
}
