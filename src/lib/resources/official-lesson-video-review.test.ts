import { describe, expect, it } from 'vitest'
import { buildOfficialLessonVideoReviewQueue } from './official-lesson-video-review'

describe('buildOfficialLessonVideoReviewQueue', () => {
  it('keeps only permitted direct-video candidates and preserves the official unit mapping', () => {
    const queue = buildOfficialLessonVideoReviewQueue({
      reconciliation: reconciliationFixture(),
      officialSubjects: [{
        programmeCode: 'DCOMP',
        semesterNumber: 2,
        departmentCode: 'COMP',
        subjectCode: 'R23CP1401',
        subjectName: 'Programming in C',
      }],
      generatedAt: '2026-08-01T00:00:00.000Z',
    })

    expect(queue.totals).toMatchObject({
      candidates: 1,
      videos: 1,
      playlists: 0,
      readyForLessonMappingReview: 1,
      draftOnly: 1,
    })
    expect(queue.learningCoverage).toEqual({
      officialLessons: 3,
      lessonCandidatesReadyForReview: 1,
      lessonsWithoutCandidate: 2,
      unmatchedResearchCandidates: 1,
    })
    expect(queue.items[0]).toMatchObject({
      canonicalUrl: 'https://www.youtube.com/watch?v=abc123def45',
      language: 'hinglish',
      publicationStatus: 'draft',
      officialLesson: {
        slug: 'unit-1-basics-of-c',
        title: 'Basics of C Programming',
        unitNumber: 1,
      },
      subjectMappings: [{
        programmeCode: 'DCOMP',
        subjectCode: 'R23CP1401',
        mappingStatus: 'ready_for_lesson_mapping_review',
        lessonSlug: 'unit-1-basics-of-c',
      }],
    })
    expect(queue.items[0]?.reviewRequired.join(' ')).toContain('named academic reviewer')
  })
})

function reconciliationFixture() {
  return {
    version: 1,
    generatedAt: '2026-08-01T00:00:00.000Z',
    source: 'content/resources/lesson-video-mappings/cwit-r23-direct-video-mappings.json',
    officialCurriculumSource: 'content/curriculum/cwit-r23/official-course-content.json',
    policy: { allowedLanguages: ['en', 'hi', 'hinglish'] },
    summary: {
      inputPendingCandidates: 2,
      reconciledPendingCandidates: 2,
      unmatchedCandidates: 1,
      officialLessons: 3,
    },
    reconciled: [
      {
        subjectCode: 'R23CP1401',
        videoId: 'abc123def45',
        title: 'C programming basics',
        channel: 'Popular Hindi Tech',
        language: 'hinglish',
        description: 'C programming basics',
        playlistId: null,
        playlistIndex: null,
        confidence: 0.9,
        sourcePdf: 'manual research',
        sourcePage: 0,
        officialProgrammeCode: 'DCOMP',
        officialSemesterNumber: 2,
        officialUnitNumber: 1,
        officialLessonSlug: 'unit-1-basics-of-c',
        officialLessonTitle: 'Basics of C Programming',
        matchedTerms: ['c', 'programming'],
        reconciliationScore: 16,
        reconciliationStatus: 'pending_academic_review' as const,
        reviewChecklist: ['Record a named academic reviewer, rationale, and decision before promotion.'],
      },
      {
        subjectCode: 'R23CP1401',
        videoId: 'not-a-real-id',
        title: 'Rejected language',
        channel: 'Other',
        language: 'mr',
        description: 'Not allowed',
        playlistId: null,
        playlistIndex: null,
        confidence: 0.9,
        sourcePdf: 'manual research',
        sourcePage: 0,
        officialProgrammeCode: 'DCOMP',
        officialSemesterNumber: 2,
        officialUnitNumber: 2,
        officialLessonSlug: 'unit-2-control',
        officialLessonTitle: 'Control structures',
        matchedTerms: ['control'],
        reconciliationScore: 12,
        reconciliationStatus: 'pending_academic_review' as const,
        reviewChecklist: [],
      },
    ],
  }
}
