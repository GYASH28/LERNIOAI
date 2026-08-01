import { describe, expect, it } from 'vitest'
import { buildMissingLessonVideoResearchQueue } from './missing-lesson-video-research'

describe('buildMissingLessonVideoResearchQueue', () => {
  it('creates exact official-unit research rows only for lessons without a candidate', () => {
    const queue = buildMissingLessonVideoResearchQueue({
      generatedAt: '2026-08-01T00:00:00.000Z',
      officialSubjects: [{
        programmeCode: 'DCOMP',
        semesterNumber: 2,
        departmentCode: 'COMP',
        subjectCode: 'R23CP1401',
        subjectName: 'Programming in C',
        sourceUrl: 'https://cwit.example/curriculum.pdf',
        units: [
          { order: 1, title: 'Unit I C basics', curriculumContent: 'Variables and input output.', learningOutcomes: ['Write a C program'], sourcePages: [12] },
          { order: 2, title: 'Unit II Control flow', curriculumContent: 'If and loops.', learningOutcomes: ['Use loops'], sourcePages: [13] },
        ],
      }],
      reconciled: [{
        officialProgrammeCode: 'DCOMP',
        subjectCode: 'R23CP1401',
        officialLessonSlug: 'unit-1-unit-i-c-basics',
      }],
    })

    expect(queue.totals).toEqual({ officialLessons: 2, lessonsWithPendingCandidate: 1, lessonsNeedingResearch: 1 })
    expect(queue.items[0]).toMatchObject({
      programmeCode: 'DCOMP',
      semesterNumber: 2,
      subjectCode: 'R23CP1401',
      lessonSlug: 'unit-2-unit-ii-control-flow',
      allowedLanguages: ['en', 'hi', 'hinglish'],
      sourcePages: [13],
    })
    expect(queue.items[0]?.youtubeSearchUrl).toContain('youtube.com/results')
  })
})
