import { describe, expect, it } from 'vitest'
import {
  isCanonicalLessonRouteSlug,
  lessonIdFromRouteSlug,
  lessonRouteSlug,
  lessonTitleSlug,
} from './lesson-slugs'

describe('lesson route slugs', () => {
  it('creates readable route slugs with a stable id suffix', () => {
    expect(lessonRouteSlug({ id: 'lesson_123', title: 'Structure of a C Program', order: 2 })).toBe(
      '2-structure-of-a-c-program--lesson_123',
    )
  })

  it('normalizes punctuation and empty titles', () => {
    expect(lessonTitleSlug('  IoT: Sensors & Actuators!  ')).toBe('iot-sensors-and-actuators')
    expect(lessonTitleSlug('!!!')).toBe('lesson')
  })

  it('extracts ids from canonical slugs and legacy id-only links', () => {
    expect(lessonIdFromRouteSlug('2-structure-of-a-c-program--lesson_123')).toBe('lesson_123')
    expect(lessonIdFromRouteSlug('lesson_123')).toBe('lesson_123')
    expect(lessonIdFromRouteSlug('')).toBeNull()
  })

  it('detects canonical links for redirect hygiene', () => {
    const lesson = { id: 'lesson_123', title: 'Structure of a C Program', order: 2 }

    expect(isCanonicalLessonRouteSlug(lesson, '2-structure-of-a-c-program--lesson_123')).toBe(true)
    expect(isCanonicalLessonRouteSlug(lesson, 'lesson_123')).toBe(false)
  })
})
