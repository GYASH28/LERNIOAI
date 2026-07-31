import { describe, expect, it } from 'vitest'
import { buildContentSecurityPolicy, safeOrigin } from './content-security-policy'

function directive(policy: string, name: string) {
  return policy
    .split('; ')
    .find((entry) => entry.startsWith(`${name} `)) ?? ''
}

describe('buildContentSecurityPolicy', () => {
  it('allows nonced app scripts, same-origin compositions, YouTube embeds and configured storage without broad https sources', () => {
    const policy = buildContentSecurityPolicy({
      nonce: 'abc123',
      nodeEnv: 'production',
      storagePublicBaseUrl: 'https://cdn.lernio.example/bucket/path',
    })

    expect(directive(policy, 'script-src')).toBe("script-src 'self' 'nonce-abc123' https://www.youtube.com")
    expect(directive(policy, 'frame-src')).toBe(
      "frame-src 'self' https://www.youtube-nocookie.com https://www.youtube.com https://cdn.lernio.example",
    )
    expect(directive(policy, 'img-src')).toBe("img-src 'self' data: blob: https://i.ytimg.com https://cdn.lernio.example")
    expect(directive(policy, 'connect-src')).toBe("connect-src 'self' https://cdn.lernio.example")
    expect(directive(policy, 'connect-src')).not.toMatch(/\shttps:(\s|$)/)
    expect(directive(policy, 'img-src')).not.toMatch(/\shttps:(\s|$)/)
    expect(directive(policy, 'frame-src')).not.toMatch(/\shttps:(\s|$)/)
    expect(policy).toContain('upgrade-insecure-requests')
  })

  it('keeps local development websocket sources and unsafe eval out of production', () => {
    const devPolicy = buildContentSecurityPolicy({ nonce: 'dev', nodeEnv: 'development' })
    const productionPolicy = buildContentSecurityPolicy({ nonce: 'prod', nodeEnv: 'production' })

    expect(directive(devPolicy, 'script-src')).toContain("'unsafe-eval'")
    expect(directive(devPolicy, 'connect-src')).toContain('ws://localhost:*')
    expect(directive(productionPolicy, 'script-src')).not.toContain("'unsafe-eval'")
    expect(directive(productionPolicy, 'connect-src')).not.toContain('ws://localhost:*')
  })

  it('uses unsafe inline scripts only for non-proxy fallback headers', () => {
    const fallbackPolicy = buildContentSecurityPolicy({
      allowUnsafeInlineScript: true,
      nodeEnv: 'production',
    })
    const proxyPolicy = buildContentSecurityPolicy({
      allowUnsafeInlineScript: true,
      nonce: 'nonce-wins',
      nodeEnv: 'production',
    })

    expect(directive(fallbackPolicy, 'script-src')).toContain("'unsafe-inline'")
    expect(directive(proxyPolicy, 'script-src')).not.toContain("'unsafe-inline'")
  })
})

describe('safeOrigin', () => {
  it('normalizes valid URLs and drops invalid storage origins', () => {
    expect(safeOrigin('https://cdn.lernio.example/path/file.pdf')).toBe('https://cdn.lernio.example')
    expect(safeOrigin('not a url')).toBeNull()
    expect(safeOrigin(null)).toBeNull()
  })
})