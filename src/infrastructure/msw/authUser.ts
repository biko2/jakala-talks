export const MSW_AUTH_USER = {
  id: 'mock-user-123',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'usuario.mock@jakala.com',
  email_confirmed_at: '2024-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2024-01-01T00:00:00.000Z',
  last_sign_in_at: '2024-01-01T00:00:00.000Z',
  app_metadata: {
    provider: 'google',
    providers: ['google']
  },
  user_metadata: {
    full_name: 'Usuario Mock',
    avatar_url: 'https://ui-avatars.com/api/?name=Usuario+Mock&background=random&color=fff'
  },
  identities: [],
  created_at: '2024-01-01T00:00:00.000Z',
  updated_at: '2024-01-01T00:00:00.000Z',
  is_anonymous: false
}

export function createMockAccessToken(): string {
  const header = base64Url({ alg: 'none', typ: 'JWT' })
  const payload = base64Url({
    sub: MSW_AUTH_USER.id,
    email: MSW_AUTH_USER.email,
    role: 'authenticated',
    aud: 'authenticated',
    iss: 'supabase',
    iat: 1700000000,
    exp: 4102444800
  })
  return `${header}.${payload}.msw`
}

function base64Url(value: object): string {
  const json = JSON.stringify(value)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach(byte => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
}

export function createMockSession() {
  const access_token = createMockAccessToken()
  return {
    access_token,
    refresh_token: 'msw-refresh-token',
    token_type: 'bearer',
    expires_in: 60 * 60 * 24 * 365,
    expires_at: 4102444800,
    user: MSW_AUTH_USER
  }
}
