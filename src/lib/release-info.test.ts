import { describe, expect, it } from 'vitest'
import { getReleaseInfo } from './release-info'

describe('public deployment metadata', () => {
  const revision = '7747a058f80bdb97341b2a60742bca22d91bed80'

  it('reports the Vercel git revision without exposing environment values', () => {
    expect(getReleaseInfo({ VERCEL_GIT_COMMIT_SHA: revision, VERCEL_ENV: 'production' }))
      .toEqual({ app: 'lernio', revision, stage: 'production' })
  })

  it('fails closed when Vercel system revision is unavailable or invalid', () => {
    expect(getReleaseInfo({ NODE_ENV: 'production' }).revision).toBeNull()
    expect(getReleaseInfo({ VERCEL_GIT_COMMIT_SHA: 'bad', VERCEL_ENV: 'preview' }))
      .toEqual({ app: 'lernio', revision: null, stage: 'preview' })
  })
})
