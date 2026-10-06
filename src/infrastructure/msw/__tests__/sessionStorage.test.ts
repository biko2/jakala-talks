import { TextEncoder } from 'util'
import { seedMockSession } from '../sessionStorage'
import { createMockSession } from '../fixture/session'

Object.assign(globalThis, { TextEncoder })

describe('seedMockSession', () => {
  const originalCookie = document.cookie

  beforeEach(() => {
    window.localStorage.clear()
    document.cookie.split(';').forEach((cookie) => {
      const name = cookie.split('=')[0]?.trim()
      if (name) {
        document.cookie = `${name}=; path=/; max-age=0`
      }
    })
  })

  afterAll(() => {
    document.cookie = originalCookie
  })

  it('escribe la sesión mock en localStorage y cookie del project ref', () => {
    seedMockSession()

    const key = 'sb-test-auth-token'
    const expected = JSON.stringify(createMockSession())

    expect(window.localStorage.getItem(key)).toBe(expected)
    expect(decodeURIComponent(document.cookie)).toContain(`${key}=${expected}`)
  })
})
