import { describe, expect, it } from 'vitest'
import {
  assertSafeRuntimeConfig,
  resolveAuthMode,
  resolveRuntimeAuthUrl,
  safeAuthRedirect,
  safeCallbackPath,
} from './auth-policy'

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

describe('production auth origin handling', () => {
  it('repairs the obsolete Lernio production hostname', () => {
    expect(
      resolveRuntimeAuthUrl({
        configuredUrl: 'https://lernio-ai.vercel.app',
        vercelEnv: 'production',
      }),
    ).toBe('https://lernioai.vercel.app')
  })

  it('uses the active Vercel preview host instead of a production callback host', () => {
    expect(
      resolveRuntimeAuthUrl({
        configuredUrl: 'https://lernio-ai.vercel.app',
        vercelEnv: 'preview',
        vercelUrl: 'lernio-git-fix-auth-example.vercel.app',
      }),
    ).toBe('https://lernio-git-fix-auth-example.vercel.app')
  })

  it('keeps an explicitly configured app origin', () => {
    expect(
      resolveRuntimeAuthUrl({
        configuredUrl: 'https://lernio-ai.vercel.app',
        appUrl: 'https://learn.example.com',
        vercelEnv: 'production',
      }),
    ).toBe('https://learn.example.com')
  })

  it('redirects relative callbacks to the canonical host when baseUrl is stale', () => {
    expect(
      safeAuthRedirect({
        url: '/dashboard',
        baseUrl: 'https://lernio-ai.vercel.app',
        canonicalUrl: 'https://lernioai.vercel.app',
      }),
    ).toBe('https://lernioai.vercel.app/dashboard')
  })

  it('allows the current canonical host but rejects external redirects', () => {
    expect(
      safeAuthRedirect({
        url: 'https://lernioai.vercel.app/learn',
        baseUrl: 'https://lernio-ai.vercel.app',
        canonicalUrl: 'https://lernioai.vercel.app',
      }),
    ).toBe('https://lernioai.vercel.app/learn')

    expect(
      safeAuthRedirect({
        url: 'https://evil.example/phish',
        baseUrl: 'https://lernio-ai.vercel.app',
        canonicalUrl: 'https://lernioai.vercel.app',
      }),
    ).toBe('https://lernioai.vercel.app/dashboard')
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

  it('rejects demo mode in Vercel production', () => {
    expect(() =>
      assertSafeRuntimeConfig({
        demoModeEnv: 'true',
        nodeEnv: 'production',
        vercelEnv: 'production',
      }),
    ).toThrow(/LERNIO_DEMO_MODE/)
  })

  it('allows demo mode in Vercel preview builds', () => {
    expect(() =>
      assertSafeRuntimeConfig({
        demoModeEnv: 'true',
        nodeEnv: 'production',
        vercelEnv: 'preview',
      }),
    ).not.toThrow()
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
