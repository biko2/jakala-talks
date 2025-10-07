import { User } from '@supabase/supabase-js'
import { EnvironmentDetector } from '../environment/EnvironmentDetector'

export const MOCK_USER: User = {
  id: 'mock-user-123',
  email: 'usuario.mock@jakala.com',
  user_metadata: {
    full_name: 'Usuario Mock',
    avatar_url: 'https://ui-avatars.com/api/?name=Usuario+Mock&background=random&color=fff'
  },
  app_metadata: {},
  aud: 'authenticated',
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z'
}

export const isMockMode = (): boolean => {
  return EnvironmentDetector.isMockMode()
}
