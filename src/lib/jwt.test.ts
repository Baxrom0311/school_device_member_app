import { describe, it, expect } from 'vitest'
import { isTokenExpired } from './jwt'

function makeJwt(exp: number): string {
  const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }))
  const payload = btoa(JSON.stringify({ exp, sub: '1' }))
  return `${header}.${payload}.signature`
}

describe('isTokenExpired', () => {
  it('returns true for expired token', () => {
    const expired = makeJwt(Math.floor(Date.now() / 1000) - 60)
    expect(isTokenExpired(expired)).toBe(true)
  })

  it('returns false for valid token', () => {
    const valid = makeJwt(Math.floor(Date.now() / 1000) + 300)
    expect(isTokenExpired(valid)).toBe(false)
  })

  it('returns true for token expiring within 30s buffer', () => {
    const almostExpired = makeJwt(Math.floor(Date.now() / 1000) + 10)
    expect(isTokenExpired(almostExpired)).toBe(true)
  })

  it('returns true for malformed token', () => {
    expect(isTokenExpired('not.a.jwt')).toBe(true)
    expect(isTokenExpired('')).toBe(true)
  })
})
