import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('server-only', () => ({}))

import {
  getEmailProviderState,
  sendPasswordResetEmail,
  sendVerificationEmail,
} from './email'

describe('transactional email', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('does not log raw tokens when mail is unconfigured outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => undefined)

    await sendPasswordResetEmail('student@example.com', 'raw-secret-token')

    const output = warn.mock.calls.flat().join(' ')
    expect(output).toContain('password-reset email prepared')
    expect(output).not.toContain('raw-secret-token')
    expect(output).not.toContain('?token=')
  })

  it('fails closed in production when the provider is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', '')
    vi.stubEnv('EMAIL_FROM', '')

    await expect(
      sendVerificationEmail('student@example.com', 'raw-secret-token'),
    ).rejects.toThrow('Email provider is not configured')
  })

  it('sends through the configured Resend endpoint', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('NEXTAUTH_URL', 'https://app.lernio.ai/')
    vi.stubEnv('RESEND_API_KEY', 're_test_key')
    vi.stubEnv('EMAIL_FROM', 'Lernio AI <noreply@lernio.ai>')
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValue(new Response('{}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    await sendPasswordResetEmail('student@example.com', 'token with spaces')

    expect(getEmailProviderState()).toBe('configured')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: {
          Authorization: 'Bearer re_test_key',
          'Content-Type': 'application/json',
        },
      }),
    )

    const [, init] = fetchMock.mock.calls[0]
    const body = JSON.parse(String(init?.body))
    expect(body).toMatchObject({
      from: 'Lernio AI <noreply@lernio.ai>',
      to: 'student@example.com',
      subject: 'Reset your Lernio AI password',
    })
    expect(body.text).toContain(
      'https://app.lernio.ai/reset-password?token=token%20with%20spaces',
    )
  })
})
