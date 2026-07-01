import { describe, expect, it } from 'vitest'
import { buildYouTubeCandidateReviewQueue } from './youtube-candidate-review'

describe('YouTube candidate review queue', () => {
  it('blocks subject-level candidates until verified lesson structure exists', () => {
    const queue = buildYouTubeCandidateReviewQueue({
      generatedAt: '2026-06-28T00:00:00.000Z',
      candidateManifest: candidateManifest({
        candidates: [
          candidate({
            officialSubjectCodes: ['R23CP1701'],
            resourceKind: 'playlist',
            metadata: { metadataStatus: 'not_supported_for_playlist', embeddable: false },
          }),
        ],
      }),
      curriculumManifests: [
        curriculumManifest({
          subjects: [
            {
              officialSubjectCode: 'R23CP1701',
              name: 'Basic Mathematics',
              units: [],
              outcomes: [{ code: 'CO1' }],
              verificationStatus: 'structure_verified',
            },
          ],
        }),
      ],
      curriculumManifestPaths: ['content/curriculum/cwit-r23/comp/semester-1.json'],
    })

    expect(queue.totals).toMatchObject({
      candidates: 1,
      playlists: 1,
      subjectMappings: 1,
      blockedMissingLessonStructure: 1,
      blockedUnplacedOfficialSubject: 0,
      readyForLessonMappingReview: 0,
      playlistRequiresManualOrApiReview: 1,
    })
    expect(queue.items[0]?.subjectMappings[0]).toMatchObject({
      subjectCode: 'R23CP1701',
      programmeCode: 'DCOMP',
      semesterNumber: 1,
      mappingStatus: 'blocked_missing_lesson_structure',
    })
    expect(queue.items[0]?.reviewRequired).toContain(
      'Verified lesson structure is required before creating LessonResource rows.',
    )
  })

  it('marks direct videos ready only after lesson structure exists', () => {
    const queue = buildYouTubeCandidateReviewQueue({
      candidateManifest: candidateManifest({
        candidates: [
          candidate({
            resourceKind: 'video',
            videoId: 'abc123',
            playlistId: null,
            officialSubjectCodes: ['R23CP1401'],
            metadata: {
              metadataStatus: 'found',
              title: 'Programming in C',
              channel: 'Example Channel',
              embeddable: true,
              availabilityStatus: 'public_oembed_available',
            },
          }),
        ],
      }),
      curriculumManifests: [
        curriculumManifest({
          semesterNumber: 2,
          subjects: [
            {
              officialSubjectCode: 'R23CP1401',
              name: 'Programming in C',
              units: [{ order: 1, topics: [{ order: 1, lessons: [{ slug: 'intro-to-c' }] }] }],
              outcomes: [{ code: 'CO1' }],
              verificationStatus: 'content_verified',
            },
          ],
        }),
      ],
    })

    expect(queue.totals).toMatchObject({
      videos: 1,
      oembedFound: 1,
      embeddableCandidates: 1,
      readyForLessonMappingReview: 1,
      blockedMissingLessonStructure: 0,
    })
    expect(queue.items[0]?.subjectMappings[0]?.mappingStatus).toBe('ready_for_lesson_mapping_review')
    expect(queue.items[0]?.reviewRequired).toEqual([])
  })

  it('keeps unknown advanced CIOT subject codes blocked instead of guessing placement', () => {
    const queue = buildYouTubeCandidateReviewQueue({
      candidateManifest: candidateManifest({
        candidates: [
          candidate({
            officialSubjectCodes: ['R23CI3602'],
            programmeCodes: ['DCIOT'],
            subjectTitle: 'ELECTIVE',
          }),
        ],
      }),
      curriculumManifests: [curriculumManifest()],
    })

    expect(queue.totals.blockedMissingManifestSubject).toBe(1)
    expect(queue.items[0]?.subjectMappings[0]).toMatchObject({
      subjectCode: 'R23CI3602',
      programmeCode: null,
      semesterNumber: null,
      mappingStatus: 'blocked_missing_manifest_subject',
    })
    expect(queue.items[0]?.reviewRequired).toContain(
      'At least one subject code is absent from verified local manifests.',
    )
  })

  it('separates unplaced official catalog subjects from unknown subject codes', () => {
    const queue = buildYouTubeCandidateReviewQueue({
      candidateManifest: candidateManifest({
        candidates: [
          candidate({
            officialSubjectCodes: ['R23CI3602'],
            programmeCodes: ['DCIOT'],
            subjectTitle: 'Cloud Computing',
          }),
        ],
      }),
      curriculumManifests: [curriculumManifest()],
      officialCourseCatalog: {
        catalogEntries: [
          {
            departmentCode: 'CIOT',
            courseCode: 'R23CI3602',
            courseName: 'Cloud Computing',
          },
        ],
      },
    })

    expect(queue.totals.blockedMissingManifestSubject).toBe(0)
    expect(queue.totals.blockedUnplacedOfficialSubject).toBe(1)
    expect(queue.items[0]?.subjectMappings[0]).toMatchObject({
      departmentCode: 'CIOT',
      subjectCode: 'R23CI3602',
      subjectName: 'Cloud Computing',
      subjectVerificationStatus: 'official_course_catalog_only',
      mappingStatus: 'blocked_unplaced_official_subject',
    })
    expect(queue.items[0]?.reviewRequired).toContain(
      'At least one official subject code is unplaced until a semester manifest is obtained.',
    )
  })
})

function candidateManifest(input: { candidates: unknown[] }) {
  return {
    manifestVersion: 1,
    status: 'draft',
    verificationStatus: 'metadata_checked_unreviewed',
    generatedAt: '2026-06-28T00:00:00.000Z',
    candidates: input.candidates,
  }
}

function candidate(overrides: Record<string, unknown> = {}) {
  return {
    id: 'ytcand_test',
    sourceId: 'cwit-youtube-sem-1-2',
    sourcePage: 3,
    sourcePdf: 'content-import/CWIT_Semester_1_2_YouTube_Lecture_Links.pdf',
    originalUrl: 'https://www.youtube.com/playlist?list=PLexample',
    canonicalUrl: 'https://www.youtube.com/playlist?list=PLexample',
    resourceKind: 'playlist',
    externalId: 'PLexample',
    videoId: null,
    playlistId: 'PLexample',
    role: 'primary_video',
    subjectTitle: 'Basic Mathematics',
    officialSubjectCodes: ['R23CP1701'],
    programmeCodes: ['DCOMP'],
    verificationStatus: 'metadata_checked_unreviewed',
    publicationStatus: 'draft',
    ...overrides,
  }
}

function curriculumManifest(overrides: Record<string, unknown> = {}) {
  return {
    departmentCode: 'COMP',
    programmeCode: 'DCOMP',
    schemeCode: 'R23',
    semesterNumber: 1,
    verificationStatus: 'structure_verified',
    subjects: [
      {
        officialSubjectCode: 'R23CP1701',
        name: 'Basic Mathematics',
        units: [],
        outcomes: [],
        verificationStatus: 'structure_verified',
      },
    ],
    ...overrides,
  }
}
