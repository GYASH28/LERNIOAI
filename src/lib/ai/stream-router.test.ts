import { afterEach, describe, expect, it, vi } from 'vitest'
import { getStreamingProviderOrder } from '@/lib/ai/stream-router'

describe('AI streaming provider routing', () => {
  afterEach(() => vi.unstubAllEnvs())

  it('uses Gemini for quality and Groq for fast work when both are configured', () => {
    vi.stubEnv('GROQ_API_KEY', 'groq-test-key')
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key')
    vi.stubEnv('AI_QUALITY_PROVIDER', '')
    vi.stubEnv('AI_FAST_PROVIDER', '')

    expect(getStreamingProviderOrder('quality')).toEqual(['gemini', 'groq'])
    expect(getStreamingProviderOrder('fast')).toEqual(['groq', 'gemini'])
  })

  it('honours an explicit role preference but includes only configured fallbacks', () => {
    vi.stubEnv('GROQ_API_KEY', '')
    vi.stubEnv('GEMINI_API_KEY', 'gemini-test-key')
    vi.stubEnv('AI_FAST_PROVIDER', 'groq')

    expect(getStreamingProviderOrder('fast')).toEqual(['gemini'])
  })
})
