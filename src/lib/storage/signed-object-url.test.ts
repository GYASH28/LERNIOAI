import { describe, expect, it } from 'vitest'
import { buildSignedObjectUrl, signObjectUrl } from './signed-object-url'

describe('buildSignedObjectUrl', () => {
  const now = new Date('2026-06-29T10:00:00.000Z')

  it('returns null when storage base or object key is missing', () => {
    expect(buildSignedObjectUrl({ objectKey: 'notes/a.html', env: {}, now })).toBeNull()
    expect(buildSignedObjectUrl({
      objectKey: '  ',
      env: { STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.test' },
      now,
    })).toBeNull()
  })

  it('builds a signed encoded object URL without exposing secrets', () => {
    const url = buildSignedObjectUrl({
      objectKey: '/lesson-notes/R23 CP/intro.html',
      disposition: 'inline',
      env: {
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.test/private',
        STORAGE_SIGNING_SECRET: 'secret-value',
        STORAGE_SIGNED_URL_TTL_SECONDS: '120',
      },
      now,
    })

    expect(url).toBeTruthy()
    const parsed = new URL(url!)
    expect(parsed.origin).toBe('https://cdn.example.test')
    expect(parsed.pathname).toBe('/private/lesson-notes/R23%20CP/intro.html')
    expect(parsed.searchParams.get('expires')).toBe(String(Math.floor(now.getTime() / 1000) + 120))
    expect(parsed.searchParams.get('signature')).toBe(
      signObjectUrl(parsed.pathname, Number(parsed.searchParams.get('expires')), 'inline', null, 'secret-value'),
    )
    expect(url).not.toContain('secret-value')
  })

  it('requires a signing secret in production', () => {
    expect(() => buildSignedObjectUrl({
      objectKey: 'lesson-notes/a.html',
      env: {
        NODE_ENV: 'production',
        STORAGE_PUBLIC_BASE_URL: 'https://cdn.example.test',
      },
      now,
    })).toThrow('STORAGE_SIGNING_SECRET is required in production.')
  })
})
