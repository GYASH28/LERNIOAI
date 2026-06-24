import { describe, expect, it } from 'vitest'
import { rateLimitKey } from './rate-limit-key'

describe('rateLimitKey', () => {
  it('hashes normalized action and identifier values', () => {
    expect(rateLimitKey('login', ' Student@Example.com ')).toBe(rateLimitKey('login', 'student@example.com'))
    expect(rateLimitKey('login', 'student@example.com')).not.toContain('student@example.com')
    expect(rateLimitKey('login', 'student@example.com')).toHaveLength(64)
  })
})
