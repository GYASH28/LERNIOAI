/**
 * Audit fix #30 (CVSS 4.5): the existing rate-limit.test.ts only tested
 * `rateLimitKey` (the key-hashing helper). The actual `checkRateLimit`
 * function — which is what the application uses — was untested.
 *
 * This file tests `checkRateLimit` directly using the memory-fallback path
 * (no real database needed). The DB path is exercised by integration tests
 * that require a running Postgres instance.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

// Mock the db module so checkRateLimit falls back to the memory bucket path.
vi.mock('@/lib/db', () => ({
  db: {
    $queryRaw: vi.fn().mockImplementation(() => {
      throw new Error('Database unavailable in unit test — using memory fallback')
    }),
  },
}))

import { checkRateLimit } from './rate-limit'
import { rateLimitKey } from './rate-limit-key'

describe('rateLimitKey (existing tests — kept)', () => {
  it('hashes normalized action and identifier values', () => {
    expect(rateLimitKey('login', ' Student@Example.com ')).toBe(rateLimitKey('login', 'student@example.com'))
    expect(rateLimitKey('login', 'student@example.com')).not.toContain('student@example.com')
    expect(rateLimitKey('login', 'student@example.com')).toHaveLength(64)
  })
})

describe('checkRateLimit (memory fallback path — audit fix #30)', () => {
  beforeEach(() => {
    const g = globalThis as typeof globalThis & {
      __lernioRateLimit?: Map<string, unknown>
    }
    g.__lernioRateLimit?.clear()
  })

  afterEach(() => {
    vi.clearAllMocks()
  })

  it('allows the first N requests within the window', async () => {
    const action = 'test-allow'
    const identifier = 'user-1'

    for (let i = 0; i < 5; i++) {
      const result = await checkRateLimit({
        action,
        identifier,
        limit: 5,
        windowMs: 60_000,
      })
      expect(result.allowed).toBe(true)
      expect(result.backend).toBe('memory')
    }
  })

  it('blocks the (N+1)th request within the window', async () => {
    const action = 'test-block'
    const identifier = 'user-2'

    for (let i = 0; i < 3; i++) {
      await checkRateLimit({ action, identifier, limit: 3, windowMs: 60_000 })
    }

    const fourth = await checkRateLimit({
      action,
      identifier,
      limit: 3,
      windowMs: 60_000,
    })
    expect(fourth.allowed).toBe(false)
    expect(fourth.remaining).toBe(0)
    expect(fourth.retryAfterSec).toBeGreaterThan(0)
  })

  it('resets the counter after the window expires', async () => {
    const action = 'test-reset'
    const identifier = 'user-3'

    for (let i = 0; i < 2; i++) {
      await checkRateLimit({ action, identifier, limit: 2, windowMs: 10 })
    }

    const blocked = await checkRateLimit({
      action,
      identifier,
      limit: 2,
      windowMs: 10,
    })
    expect(blocked.allowed).toBe(false)

    await new Promise((resolve) => setTimeout(resolve, 20))

    const after = await checkRateLimit({
      action,
      identifier,
      limit: 2,
      windowMs: 10,
    })
    expect(after.allowed).toBe(true)
  })

  it('tracks different actions and identifiers independently', async () => {
    const a1 = await checkRateLimit({
      action: 'action-a',
      identifier: 'user-x',
      limit: 1,
      windowMs: 60_000,
    })
    expect(a1.allowed).toBe(true)

    const a2 = await checkRateLimit({
      action: 'action-a',
      identifier: 'user-x',
      limit: 1,
      windowMs: 60_000,
    })
    expect(a2.allowed).toBe(false)

    const b = await checkRateLimit({
      action: 'action-b',
      identifier: 'user-x',
      limit: 1,
      windowMs: 60_000,
    })
    expect(b.allowed).toBe(true)

    const c = await checkRateLimit({
      action: 'action-a',
      identifier: 'user-y',
      limit: 1,
      windowMs: 60_000,
    })
    expect(c.allowed).toBe(true)
  })
})
