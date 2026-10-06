export const MOCK_SESSION_USER = {
  id: '11111111-1111-4111-8111-111111111111',
  aud: 'authenticated',
  role: 'authenticated',
  email: 'usuario.mock@jakala.com',
  email_confirmed_at: '2026-01-01T00:00:00.000Z',
  phone: '',
  confirmed_at: '2026-01-01T00:00:00.000Z',
  last_sign_in_at: '2026-01-01T00:00:00.000Z',
  app_metadata: {
    provider: 'email',
    providers: ['email'],
  },
  user_metadata: {
    email: 'usuario.mock@jakala.com',
    email_verified: true,
    full_name: 'Usuario Mock',
    name: 'Usuario Mock',
  },
  identities: [],
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  is_anonymous: false,
}

export const MOCK_SESSION_EXPIRES_AT = 4102444800

function toBase64Url(value: object): string {
  const json = JSON.stringify(value)
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

export function createMockAccessToken(): string {
  const header = toBase64Url({ alg: 'HS256', typ: 'JWT' })
  const payload = toBase64Url({
    aud: 'authenticated',
    exp: MOCK_SESSION_EXPIRES_AT,
    iat: 1700000000,
    sub: MOCK_SESSION_USER.id,
    email: MOCK_SESSION_USER.email,
    role: 'authenticated',
    session_id: '00000000-0000-4000-8000-000000000001',
  })
  return `${header}.${payload}.mock-signature`
}

export function createMockSession() {
  return {
    access_token: createMockAccessToken(),
    refresh_token: 'mock-refresh-token',
    expires_in: 3600,
    expires_at: MOCK_SESSION_EXPIRES_AT,
    token_type: 'bearer',
    user: MOCK_SESSION_USER,
  }
}
