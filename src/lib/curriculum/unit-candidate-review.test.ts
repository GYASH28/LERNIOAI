import { describe, expect, it } from 'vitest'
import { buildOfficialUnitCandidateReviewQueue } from './unit-candidate-review'

describe('official unit candidate review queue', () => {
  it('classifies extracted official unit candidates without publishing them', () => {
    const queue = buildOfficialUnitCandidateReviewQueue({
      generatedAt: '2026-06-29T00:00:00.000Z',
      sourceExtractionReport: 'content/curriculum/cwit-r23/extraction-reports/official-structure-candidates.json',
      extractionReport: {
        generatedAt: '2026-06-28T00:00:00.000Z',
        status: 'review_only',
        totals: {
          subjects: 4,
          subjectsWithUnitCandidates: 2,
          subjectsWithPromotableUnitCandidates: 1,
        },
        subjects: [
          subject({
            officialSubjectCode: 'R23CP1401',
            candidateUnits: [
              { order: 1, rawLabel: 'I', title: 'Basics of C Programming', source: 'summary_table' },
              { order: 2, rawLabel: 'II', title: 'Control Structures', source: 'summary_table' },
              { order: 3, rawLabel: 'III', title: 'Arrays and Structure', source: 'summary_table' },
              { order: 4, rawLabel: 'IV', title: 'Functions', source: 'summary_table' },
              { order: 5, rawLabel: 'V', title: 'Pointers', source: 'summary_table' },
            ],
            unitQuality: { promotable: true, blockers: [] },
          }),
          subject({
            officialSubjectCode: 'R23CP1701',
            candidateUnits: [
              { order: 1, rawLabel: 'I', title: 'Algebra', source: 'summary_table' },
              { order: 5, rawLabel: 'V', title: 'Algebra', source: 'summary_table' },
            ],
            unitQuality: { promotable: false, blockers: ['Duplicate unit titles were extracted.'] },
          }),
          subject({
            officialSubjectCode: 'R23CP2201',
            candidateUnits: [],
            unitQuality: {
              promotable: false,
              blockers: ['Fewer than five unit titles were extracted.'],
            },
          }),
          subject({
            officialSubjectCode: 'R23CP4701',
            candidateUnits: [],
            unitQuality: {
              promotable: false,
              blockers: ['Fewer than five unit titles were extracted.'],
            },
            extractionStatus: 'course_block_not_found',
          }),
        ],
      },
    })

    expect(queue.status).toBe('draft')
    expect(queue.totals).toMatchObject({
      subjects: 4,
      subjectsWithUnitCandidates: 2,
      readyForUnitPromotionReview: 1,
      needsManualUnitReview: 1,
      blockedNoUnitCandidates: 1,
      blockedMissingCourseBlock: 1,
      draftOnly: 3,
    })
    expect(queue.items.find((item) => item.officialSubjectCode === 'R23CP1401')).toMatchObject({
      reviewStatus: 'ready_for_unit_promotion_review',
      publicationStatus: 'ready_for_reviewer_promotion',
    })
    expect(queue.items.find((item) => item.officialSubjectCode === 'R23CP4701')?.reviewRequired).toContain(
      'Official course block was not extracted for this subject; locate the source pages manually.',
    )
  })
})

function subject(overrides: Record<string, unknown>) {
  return { ...baseSubject(), ...overrides }
}

function baseSubject() {
  return {
    manifest: 'content/curriculum/cwit-r23/comp/semester-2.json',
    departmentCode: 'COMP',
    programmeCode: 'DCOMP',
    semesterNumber: 2,
    officialSubjectCode: 'R23CP9999',
    subjectName: 'Test Subject',
    sourcePages: [10, 11],
    candidateUnits: [],
    unitQuality: { promotable: false, blockers: [] },
    extractionStatus: 'structure_promotable' as const,
  }
}
