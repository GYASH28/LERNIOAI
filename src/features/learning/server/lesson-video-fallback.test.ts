import { describe, expect, it } from 'vitest'
import { selectLessonVideoResource, type LessonVideoCandidate } from './lesson-video-fallback'

describe('selectLessonVideoResource', () => {
  it('keeps the configured primary video when it is embeddable, healthy, and curricularly reviewed', () => {
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

  it('does not promote an alternate that is also unplayable — shows nothing instead', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, embedUrl: null }),
      video({ lessonResourceId: 'alternate', role: 'alternate_video', linkHealth: 'stale' }),
    ])

    // Neither video is playable, so nothing is shown to the student
    expect(selection.primaryVideo).toBeNull()
    expect(selection.fallbackReason).toBeNull()
  })

  // ─── Curricular review gate tests ───

  it('excludes unreviewed videos from student-facing selection', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: 'unreviewed' }),
    ])

    expect(selection.primaryVideo).toBeNull()
    expect(selection.pendingCurricularReview).toBe(true)
  })

  it('excludes videos marked wrong_topic', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: 'wrong_topic' }),
      video({ lessonResourceId: 'alt', role: 'alternate_video', curricularReviewStatus: 'correct' }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('alt')
    expect(selection.pendingCurricularReview).toBe(false)
  })

  it('excludes videos marked low_quality', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: 'low_quality' }),
    ])

    expect(selection.primaryVideo).toBeNull()
    expect(selection.pendingCurricularReview).toBe(false)
  })

  it('selects a curricularly-correct alternate over an unreviewed primary', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: 'unreviewed' }),
      video({ lessonResourceId: 'alt', role: 'alternate_video', curricularReviewStatus: 'correct' }),
    ])

    expect(selection.primaryVideo?.lessonResourceId).toBe('alt')
    expect(selection.pendingCurricularReview).toBe(false)
    expect(selection.fallbackReason).toContain('not been reviewed')
  })

  it('sets pendingCurricularReview=false when all videos are reviewed (even if rejected)', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: 'wrong_topic' }),
    ])

    expect(selection.primaryVideo).toBeNull()
    expect(selection.pendingCurricularReview).toBe(false)
  })

  it('sets pendingCurricularReview=false when no videos exist at all', () => {
    const selection = selectLessonVideoResource([])

    expect(selection.primaryVideo).toBeNull()
    expect(selection.pendingCurricularReview).toBe(false)
  })

  it('treats null curricularReviewStatus as unreviewed (old data)', () => {
    const selection = selectLessonVideoResource([
      video({ lessonResourceId: 'primary', role: 'primary_video', isPrimary: true, curricularReviewStatus: null }),
    ])

    expect(selection.primaryVideo).toBeNull()
    expect(selection.pendingCurricularReview).toBe(true)
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
    curricularReviewStatus: 'correct',
    ...overrides,
  }
}
