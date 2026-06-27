import { describe, expect, it } from 'vitest'
import { assertSafeRuntimeConfig, resolveAuthMode, safeCallbackPath } from './auth-policy'

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

describe('safeCallbackPath', () => {
  it('allows relative in-app paths', () => {
    expect(safeCallbackPath('/dashboard')).toBe('/dashboard')
    expect(safeCallbackPath('/learn?subject=1')).toBe('/learn?subject=1')
  })

  it('rejects protocol-relative and external callback URLs', () => {
    expect(safeCallbackPath('//evil.example')).toBe('/dashboard')
    expect(safeCallbackPath('https://evil.example/phish')).toBe('/dashboard')
  })
})

describe('assertSafeRuntimeConfig', () => {
  it('rejects demo mode in production', () => {
    expect(() =>
      assertSafeRuntimeConfig({
        demoModeEnv: 'true',
        nodeEnv: 'production',
        vercelEnv: undefined,
      }),
    ).toThrow(/LERNIO_DEMO_MODE/)
  })

  it('allows demo mode outside production', () => {
    expect(() =>
      assertSafeRuntimeConfig({
        demoModeEnv: 'true',
        nodeEnv: 'development',
        vercelEnv: 'preview',
      }),
    ).not.toThrow()
  })
})
