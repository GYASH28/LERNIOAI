import { describe, expect, it } from 'vitest'
import {
  AUTH_SERVICE_UNAVAILABLE,
  credentialSignInError,
  signInRouteError,
} from './auth-feedback'

describe('credential sign-in error feedback', () => {
  it('shows a generic invalid-credentials message without account enumeration', () => {
    expect(credentialSignInError({ error: 'CredentialsSignin', ok: false }))
      .toBe('Invalid email or password.')
    expect(signInRouteError('CredentialsSignin')).toBe('Invalid email or password.')
  })

  it('distinguishes infrastructure and network failures from wrong passwords', () => {
    expect(credentialSignInError({ error: AUTH_SERVICE_UNAVAILABLE, ok: false }))
      .toContain('temporarily unavailable')
    expect(credentialSignInError({ error: 'Callback', ok: false }))
      .toContain('temporarily unavailable')
    expect(credentialSignInError({ ok: false })).toContain('temporarily unavailable')
    expect(credentialSignInError(null)).toContain('Could not contact')
    expect(signInRouteError(AUTH_SERVICE_UNAVAILABLE)).toContain('temporarily unavailable')
    expect(signInRouteError('Callback')).toContain('temporarily unavailable')
  })

  it('allows success without a false login failure', () => {
    expect(credentialSignInError({ ok: true, error: null })).toBeNull()
    expect(credentialSignInError({ ok: true })).toBeNull()
  })

  it('uses a safe notice for other callback errors', () => {
    expect(signInRouteError('OAuthCallback')).toContain('session')
  })
})
