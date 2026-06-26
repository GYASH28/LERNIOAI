import { describe, expect, it } from 'vitest'
import { ReviewResourceSchema, UpsertResourceProviderSchema } from './resource-governance'

describe('UpsertResourceProviderSchema', () => {
  it('normalizes valid provider governance settings', () => {
    const result = UpsertResourceProviderSchema.parse({
      key: 'CWIT_OFFICIAL',
      name: 'CWIT Official Website',
      providerType: 'official',
      baseUrl: 'https://cwit.mespune.org/',
    })

    expect(result.status).toBe('active')
    expect(result.key).toBe('CWIT_OFFICIAL')
  })

  it('rejects provider keys that cannot be used as stable identifiers', () => {
    expect(
      UpsertResourceProviderSchema.safeParse({
        key: 'CWIT Official!',
        name: 'CWIT Official Website',
        providerType: 'official',
      }).success,
    ).toBe(false)
  })
})

describe('ReviewResourceSchema', () => {
  it('allows the explicit moderation decisions used by the admin review queue', () => {
    for (const decision of ['approved', 'rejected', 'changes_requested', 'held'] as const) {
      expect(ReviewResourceSchema.safeParse({ resourceId: 'resource_1', decision }).success).toBe(true)
    }
  })

  it('rejects vague review decisions', () => {
    expect(ReviewResourceSchema.safeParse({ resourceId: 'resource_1', decision: 'maybe' }).success).toBe(false)
  })
})
