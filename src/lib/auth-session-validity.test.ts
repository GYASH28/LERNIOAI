import { describe, expect, it } from 'vitest'
import { isActiveSessionIdentity } from './auth-session-validity'

describe('isActiveSessionIdentity', () => {
  it('accepts a real active NextAuth user', () => {
    expect(isActiveSessionIdentity({ id: 'student-123', email: 'student@example.com', role: 'student', status: 'active' })).toBe(true)
  })

  it.each([
    null,
    {},
    { id: 'undefined', email: 'student@example.com' },
    { id: 'null', email: 'student@example.com' },
    { id: '', email: 'student@example.com' },
    { id: 12, email: 'student@example.com' },
    { id: 'student', email: 'not-an-email' },
    { id: 'student', email: 'student@example.com', status: 'disabled' },
    { id: 'student', email: 'student@example.com', status: 'revoked' },
    { id: 'student', email: 'student@example.com', sessionRevoked: true },
  ])('rejects a missing, malformed or revoked user %#', (value) => {
    expect(isActiveSessionIdentity(value)).toBe(false)
  })
})
