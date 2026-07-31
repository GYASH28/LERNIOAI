import { describe, expect, it } from 'vitest'
import type { ManifestSubject } from '@/lib/curriculum/manifest-data'
import type { Lesson } from '@/lib/curriculum/lesson-notes-loader'
import { buildManifestLessonVideoAssignments } from './lesson-video-resolver'

function lesson(slug: string, title: string, keyConcepts: string[] = []): Lesson {
  return {
    slug,
    title,
    durationMin: 20,
    difficulty: 'medium',
    overview: `${title} overview`,
    keyConcepts,
    formulas: [],
    tables: [],
    diagrams: [],
    codeExamples: [],
    commonMistakes: [],
    examTips: [],
    practiceQuestions: [],
  }
}

function subject(resources: ManifestSubject['resources']): ManifestSubject {
  return {
    code: 'TEST',
    alternateCode: null,
    name: 'Test Subject',
    category: 'theory',
    priority: 'important',
    credits: 4,
    description: 'Test curriculum',
    coverageFocus: 'arrays, linked lists, stacks',
    resources,
  }
}

function resource(title: string, url: string, role = 'primary_video'): ManifestSubject['resources'][number] {
  return {
    title,
    channel: 'Lernio Test',
    language: 'en',
    role,
    url,
    description: title,
    sourcePdf: 'test.pdf',
    sourcePage: 1,
  }
}

describe('lesson video resolver', () => {
  it('maps strong title matches to the correct lessons', () => {
    const assignments = buildManifestLessonVideoAssignments(
      subject([
        resource('Arrays explained', 'https://www.youtube.com/watch?v=aaaaaaaaaaa'),
        resource('Linked lists explained', 'https://www.youtube.com/watch?v=bbbbbbbbbbb'),
      ]),
      [lesson('arrays', 'Arrays'), lesson('linked-lists', 'Linked Lists')],
    )

    expect(assignments.get('arrays')?.videoId).toBe('aaaaaaaaaaa')
    expect(assignments.get('linked-lists')?.videoId).toBe('bbbbbbbbbbb')
  })

  it('never uses playlist-only resources as a lesson player', () => {
    const assignments = buildManifestLessonVideoAssignments(
      subject([
        resource('Full subject playlist', 'https://www.youtube.com/playlist?list=PL1234567890'),
      ]),
      [lesson('arrays', 'Arrays')],
    )

    expect(assignments.size).toBe(0)
  })

  it('never repeats one video across multiple lessons', () => {
    const assignments = buildManifestLessonVideoAssignments(
      subject([resource('Data structures overview', 'https://youtu.be/ccccccccccc')]),
      [lesson('arrays', 'Arrays'), lesson('stacks', 'Stacks')],
    )

    expect(assignments.size).toBe(1)
    expect(new Set([...assignments.values()].map((item) => item.videoId)).size).toBe(assignments.size)
  })

  it('uses remaining direct videos in curriculum order without duplication', () => {
    const assignments = buildManifestLessonVideoAssignments(
      subject([
        resource('Lecture one', 'https://www.youtube.com/watch?v=ddddddddddd'),
        resource('Lecture two', 'https://www.youtube.com/watch?v=eeeeeeeeeee'),
      ]),
      [lesson('alpha', 'Alpha'), lesson('beta', 'Beta')],
    )

    expect(assignments.get('alpha')?.videoId).toBe('ddddddddddd')
    expect(assignments.get('beta')?.videoId).toBe('eeeeeeeeeee')
  })
})
