import { describe, expect, it } from 'vitest'
import { resolveAuthMode } from './auth-policy'

describe('resolveAuthMode', () => {
  it('uses demo mode only when explicitly enabled', () => {
    expect(resolveAuthMode({ demoModeEnv: 'true', sessionEmail: null })).toEqual({ mode: 'demo' })
    expect(resolveAuthMode({ demoModeEnv: undefined, sessionEmail: null })).toEqual({ mode: 'unauthenticated' })
    expect(resolveAuthMode({ demoModeEnv: 'false', sessionEmail: null })).toEqual({ mode: 'unauthenticated' })
  })

  it('prefers a verified session over demo mode', () => {
    expect(resolveAuthMode({ demoModeEnv: 'true', sessionEmail: 'student@example.com' })).toEqual({
      mode: 'session',
      email: 'student@example.com',
    })
  })
})
