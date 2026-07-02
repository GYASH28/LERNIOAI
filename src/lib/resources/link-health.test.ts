import { describe, expect, it } from 'vitest'
import { classifyLinkHealth, summarizeLinkHealth } from './link-health'

describe('link health classification', () => {
  it('classifies success, redirect, stale and unknown states', () => {
    expect(classifyLinkHealth({ httpStatus: 200, originalUrl: 'https://example.com/a' })).toBe('healthy')
    expect(classifyLinkHealth({
      httpStatus: 200,
      originalUrl: 'https://example.com/a',
      finalUrl: 'https://example.com/b',
    })).toBe('redirected')
    expect(classifyLinkHealth({ httpStatus: 404 })).toBe('stale')
    expect(classifyLinkHealth({ httpStatus: null, errorMessage: 'timeout' })).toBe('unknown')
  })

  it('summarizes report rows', () => {
    expect(summarizeLinkHealth([
      { checkedAt: 'now', url: 'a', finalUrl: null, status: 'healthy', httpStatus: 200 },
      { checkedAt: 'now', url: 'b', finalUrl: null, status: 'stale', httpStatus: 404 },
      { checkedAt: 'now', url: 'c', finalUrl: null, status: 'unknown', httpStatus: null },
    ])).toEqual({
      checked: 3,
      healthy: 1,
      redirected: 0,
      stale: 1,
      unhealthy: 0,
      unknown: 1,
    })
  })
})
