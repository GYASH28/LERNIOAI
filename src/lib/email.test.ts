import { afterEach, describe, expect, it, vi } from 'vitest'
import { sendTransactionalEmail } from './email'

const payload = {
  to: 'student@lernio.ai',
  subject: 'Test email',
  html: '<p>Hello</p>',
  text: 'Hello',
}

describe('sendTransactionalEmail', () => {
  afterEach(() => {
    vi.restoreAllMocks()
    vi.unstubAllEnvs()
    vi.unstubAllGlobals()
  })

  it('logs in development when email provider config is missing', async () => {
    vi.stubEnv('NODE_ENV', 'development')
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await sendTransactionalEmail(payload)

    expect(fetchMock).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('[email:dev]'))
  })

  it('fails closed in production when email provider config is missing', async () => {
    vi.stubEnv('NODE_ENV', 'production')

    await expect(sendTransactionalEmail(payload)).rejects.toThrow('EMAIL_PROVIDER_NOT_CONFIGURED')
  })

  it('sends through Resend when configured', async () => {
    vi.stubEnv('NODE_ENV', 'production')
    vi.stubEnv('RESEND_API_KEY', 'test-key')
    vi.stubEnv('EMAIL_FROM', 'Lernio <no-reply@lernio.ai>')
    const fetchMock = vi.fn().mockResolvedValue({ ok: true })
    vi.stubGlobal('fetch', fetchMock)

    await sendTransactionalEmail(payload)

    expect(fetchMock).toHaveBeenCalledWith(
      'https://api.resend.com/emails',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({
          Authorization: 'Bearer test-key',
          'Content-Type': 'application/json',
        }),
        cache: 'no-store',
      }),
    )
    const body = JSON.parse(fetchMock.mock.calls[0][1].body)
    expect(body).toMatchObject({
      from: 'Lernio <no-reply@lernio.ai>',
      to: payload.to,
      subject: payload.subject,
    })
  })
})
