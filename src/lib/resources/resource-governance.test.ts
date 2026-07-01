import { describe, expect, it } from 'vitest'
import {
  ReviewResourceSchema,
  UpsertLessonResourceMappingSchema,
  UpsertResourceProviderSchema,
} from './resource-governance'

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

describe('UpsertLessonResourceMappingSchema', () => {
  it('accepts governed lesson resource roles and approval decisions', () => {
    const result = UpsertLessonResourceMappingSchema.parse({
      resourceId: 'resource_1',
      lessonId: 'lesson_1',
      role: 'primary_video',
      decision: 'approve',
      sortOrder: 1,
      isRequired: true,
      startSeconds: 5,
      endSeconds: 120,
      coveragePercentage: 90,
      sourceEvidence: 'CWIT PDF page 4 and reviewer playback check.',
    })

    expect(result.role).toBe('primary_video')
    expect(result.decision).toBe('approve')
    expect(result.coveragePercentage).toBe(90)
  })

  it('rejects unguided lesson resource roles', () => {
    expect(
      UpsertLessonResourceMappingSchema.safeParse({
        resourceId: 'resource_1',
        lessonId: 'lesson_1',
        role: 'random_video',
      }).success,
    ).toBe(false)
  })
})
