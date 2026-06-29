import { describe, expect, it } from 'vitest'
import { selectLessonVideoResource, type LessonVideoCandidate } from './lesson-video-fallback'

describe('selectLessonVideoResource', () => {
  it('keeps the configured primary video when it is embeddable and healthy', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true }),
      video({ lessonResourceId: 'alternate', role: 'alternate_video' }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('primary')
    expect(selection.fallbackReason).toBeNull()
    expect(selection.alternateVideos.map((resource) => resource.lessonResourceId)).toEqual(['alternate'])
  })

  it('falls back to an approved alternate when the primary link is unhealthy', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, linkHealth: 'unhealthy' }),
      video({ lessonResourceId: 'alternate', role: 'alternate_video', qualityScore: 90 }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('alternate')
    expect(selection.fallbackReason).toContain('marked unhealthy')
    expect(selection.alternateVideos.map((resource) => resource.lessonResourceId)).toEqual(['primary'])
  })

  it('falls back to an approved alternate when the primary is not embeddable', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, embedUrl: null }),
      video({ lessonResourceId: 'alternate', role: 'alternate_video' }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('alternate')
    expect(selection.fallbackReason).toContain('not embeddable')
  })

  it('does not promote an alternate that is also unplayable', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, embedUrl: null }),
      video({ lessonResourceId: 'alternate', role: 'alternate_video', linkHealth: 'stale' }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('primary')
    expect(selection.fallbackReason).toBeNull()
  })
})

function video(overrides: Partial<LessonVideoCandidate>): LessonVideoCandidate {
  return {
    lessonResourceId: 'resource',
    role: 'alternate_video',
    embedUrl: 'https://www.youtube-nocookie.com/embed/abc123',
    linkHealth: 'healthy',
    isPrimary: false,
    sortOrder: 0,
    coveragePercentage: 80,
    qualityScore: 70,
    ...overrides,
  }
}
