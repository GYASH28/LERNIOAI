import { describe, expect, it } from 'vitest'
import { buildCwitR23CoverageReport } from './coverage-report'

describe('CWIT R23 coverage report', () => {
  it('reports present manifests and explicit missing advanced semesters', () => {
    const report = buildCwitR23CoverageReport({
      generatedAt: '2026-06-28T00:00:00.000Z',
      manifests: [
        {
          programmeCode: 'DCOMP',
          departmentCode: 'COMP',
          schemeCode: 'R23',
          semesterNumber: 1,
          verificationStatus: 'structure_verified',
          subjects: [
            {
              officialSubjectCode: 'R23CP1401',
              verificationStatus: 'structure_verified',
              units: [{ topics: [{ lessons: [{ title: 'Intro' }] }] }],
              outcomes: [{ code: 'CO1', text: 'Explain the introduction.' }],
            },
          ],
        },
      ],
      youtubeMetadata: {
        candidates: [
          {
            officialSubjectCodes: ['R23CP1401'],
            programmeCodes: ['DCOMP'],
            publicationStatus: 'draft',
            metadata: {
              metadataStatus: 'found',
              availabilityStatus: 'available',
            },
          },
        ],
      },
      youtubeReviewQueue: {
        totals: {
          candidates: 1,
          subjectMappings: 1,
          readyForLessonMappingReview: 1,
          blockedMissingManifestSubject: 0,
          blockedUnplacedOfficialSubject: 0,
          blockedMissingLessonStructure: 0,
        },
      },
      linkHealthReport: {
        resources: [
          {
            officialSubjectCodes: ['R23CP1401'],
            programmeCodes: ['DCOMP'],
            status: 'healthy',
          },
        ],
      },
      officialTimetableEvidence: {
        totals: {
          appearances: 7,
          uniqueCodes: 6,
          publicationReadySemesterManifests: 0,
        },
      },
      officialCourseCatalog: {
        totals: {
          officialCourses: 81,
          manifestSubjectCodes: 59,
          unplacedOfficialCourses: 26,
          compUnplacedOfficialCourses: 0,
          ciotUnplacedOfficialCourses: 26,
        },
      },
      officialUnitReviewQueue: {
        totals: {
          subjects: 59,
          subjectsWithUnitCandidates: 27,
          readyForUnitPromotionReview: 0,
          needsManualUnitReview: 27,
          blockedMissingCourseBlock: 4,
          blockedNoUnitCandidates: 28,
        },
      },
    })

    const comp = report.programmes.find((programme) => programme.programme === 'DCOMP')
    expect(comp?.semesters[0]).toMatchObject({
      manifestStatus: 'present',
      subjects: 1,
      subjectsWithUnits: 1,
      subjectsWithOutcomes: 1,
      units: 1,
      topics: 1,
      lessons: 1,
      youtubeCandidates: 1,
      youtubeMetadataFound: 1,
      linkHealthChecked: 1,
      linkHealthHealthy: 1,
      pendingVerification: 2,
    })
    expect(comp?.semesters[2]).toMatchObject({
      semester: 3,
      manifestStatus: 'missing_manifest',
      pendingVerification: 1,
    })
    expect(report.totals.semesters).toBe(12)
    expect(report.totals.subjectsWithOutcomes).toBe(1)
    expect(report.totals.youtubeReviewQueueReadyForLessonMapping).toBe(1)
    expect(report.totals.youtubeReviewQueueBlockedUnplacedOfficialSubject).toBe(0)
    expect(report.totals.officialTimetableEvidenceCodes).toBe(6)
    expect(report.totals.officialTimetableEvidencePublicationReady).toBe(0)
    expect(report.totals.officialCourseCatalogCourses).toBe(81)
    expect(report.totals.officialCourseCatalogManifestSubjectCodes).toBe(59)
    expect(report.totals.officialCourseCatalogUnplacedCourses).toBe(26)
    expect(report.totals.officialCourseCatalogCiotUnplaced).toBe(26)
    expect(report.totals.officialUnitReviewSubjectsWithCandidates).toBe(27)
    expect(report.totals.officialUnitReviewReadyForPromotion).toBe(0)
    expect(report.totals.officialUnitReviewBlocked).toBe(32)
  })

  it('counts explicit empty blocker manifests as present but unresolved', () => {
    const report = buildCwitR23CoverageReport({
      generatedAt: '2026-06-28T00:00:00.000Z',
      manifests: [
        {
          programmeCode: 'DCIOT',
          departmentCode: 'CIOT',
          schemeCode: 'R23',
          semesterNumber: 3,
          verificationStatus: 'needs_official_source',
          subjects: [],
        },
      ],
    })

    const ciot = report.programmes.find((programme) => programme.programme === 'DCIOT')
    expect(ciot?.semesters[2]).toMatchObject({
      semester: 3,
      manifestStatus: 'present',
      verificationStatus: 'needs_official_source',
      subjects: 0,
      pendingVerification: 1,
      pendingCurriculumVerification: 1,
    })
    expect(ciot?.semesters[2].notes.join('\n')).toContain('explicit blocker')
    expect(report.totals.manifestsPresent).toBe(1)
  })
})
