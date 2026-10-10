import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { confirmBrowserSession } from './auth-browser-session'

describe('confirmBrowserSession', () => {
  beforeEach(() => {
    vi.useRealTimers()
  })
  afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it('recognizes the signed-in user on the current origin without /api/user', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'student-1', email: ' STUDENT@example.com ', role: 'student' } }),
    })
    vi.stubGlobal('fetch', fetchMock)

    await expect(confirmBrowserSession('student@example.com')).resolves.toEqual({
      id: 'student-1',
      email: ' STUDENT@example.com ',
      role: 'student',
    })
    expect(fetchMock).toHaveBeenCalledTimes(1)
    expect(fetchMock).toHaveBeenCalledWith('/api/auth/session', {
      credentials: 'same-origin',
      cache: 'no-store',
    })
  })

  it('never treats a different user session as a successful login', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'other', email: 'other@example.com', role: 'admin' } }),
    }))
    await expect(confirmBrowserSession('student@example.com')).resolves.toBeNull()
  })

  it('rejects a revoked session even if the email and ID match', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: {
        id: 'student-1',
        email: 'student@example.com',
        status: 'revoked',
        sessionRevoked: true,
      } }),
    }))
    await expect(confirmBrowserSession('student@example.com')).resolves.toBeNull()
  })

  it('retries once after a transient session endpoint failure', async () => {
    const fetchMock = vi.fn()
      .mockRejectedValueOnce(new Error('network unavailable'))
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ user: { id: 'student-1', email: 'student@example.com', role: 'student' } }),
      })
    vi.stubGlobal('fetch', fetchMock)
    await expect(confirmBrowserSession('student@example.com')).resolves.toMatchObject({ id: 'student-1' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('rejects malformed missing-id sessions', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ user: { id: 'undefined', email: 'student@example.com' } }),
    }))
    await expect(confirmBrowserSession('student@example.com')).resolves.toBeNull()
  })
})
