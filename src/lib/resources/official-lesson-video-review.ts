import { createHash } from 'node:crypto'
import type { YouTubeCandidateReviewQueue } from './youtube-candidate-review'

type DirectVideoCandidate = {
  subjectCode: string
  videoId: string
  title: string
  channel: string
  language: string
  description: string
  playlistId: string | null
  playlistIndex: number | null
  confidence: number
  sourcePdf: string
  sourcePage: number
  officialProgrammeCode: string
  officialSemesterNumber: number
  officialUnitNumber: number
  officialLessonSlug: string
  officialLessonTitle: string
  matchedTerms: string[]
  reconciliationScore: number
  reconciliationStatus: 'pending_academic_review'
  reviewChecklist: string[]
}

type OfficialSubject = {
  subjectCode: string
  subjectName: string
  programmeCode: string
  semesterNumber: number
  departmentCode?: string
}

export type OfficialLessonVideoReconciliation = {
  version: number
  generatedAt: string
  source: string
  officialCurriculumSource: string
  policy: {
    allowedLanguages: string[]
  }
  summary: {
    inputPendingCandidates: number
    reconciledPendingCandidates: number
    unmatchedCandidates: number
    officialLessons: number
  }
  reconciled: DirectVideoCandidate[]
}

export interface BuildOfficialLessonVideoReviewQueueInput {
  reconciliation: OfficialLessonVideoReconciliation
  officialSubjects: OfficialSubject[]
  generatedAt?: string
}

/**
 * Converts the automated, official-unit reconciliation into the exact queue
 * consumed by the protected promotion workflow. It deliberately creates draft
 * rows only; no candidate becomes student-visible here.
 */
export function buildOfficialLessonVideoReviewQueue(
  input: BuildOfficialLessonVideoReviewQueueInput,
): YouTubeCandidateReviewQueue {
  const subjectIndex = new Map(
    input.officialSubjects.map((subject) => [subjectKey(subject.programmeCode, subject.subjectCode), subject]),
  )
  const allowedLanguages = new Set(['en', 'hi', 'hinglish'])
  const items = input.reconciliation.reconciled
    .filter((candidate) => allowedLanguages.has(candidate.language.toLowerCase()))
    .map((candidate) => {
      const subjectCode = candidate.subjectCode.trim().toUpperCase()
      const programmeCode = candidate.officialProgrammeCode.trim().toUpperCase()
      const subject = subjectIndex.get(subjectKey(programmeCode, subjectCode))
      const candidateId = `cwitr23_${stableId(`${programmeCode}:${subjectCode}:${candidate.officialLessonSlug}:${candidate.videoId}`)}`
      const language = candidate.language.toLowerCase() as 'en' | 'hi' | 'hinglish'

      return {
        candidateId,
        role: 'primary_video' as const,
        resourceKind: 'video' as const,
        originalUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
        canonicalUrl: `https://www.youtube.com/watch?v=${candidate.videoId}`,
        externalId: candidate.videoId,
        videoId: candidate.videoId,
        playlistId: candidate.playlistId,
        title: candidate.title.trim() || candidate.officialLessonTitle,
        channel: candidate.channel.trim() || null,
        thumbnailUrl: `https://i.ytimg.com/vi/${candidate.videoId}/hqdefault.jpg`,
        embeddable: null,
        metadataStatus: 'pending_reviewer_verification',
        availabilityStatus: 'unchecked',
        language,
        officialLesson: {
          slug: candidate.officialLessonSlug,
          title: candidate.officialLessonTitle,
          unitNumber: candidate.officialUnitNumber,
          matchedTerms: candidate.matchedTerms,
          reconciliationScore: candidate.reconciliationScore,
        },
        sourceEvidence: {
          sourceId: 'cwit-r23-official-lesson-reconciliation',
          sourcePdf: candidate.sourcePdf || null,
          sourcePage: candidate.sourcePage > 0 ? candidate.sourcePage : null,
        },
        officialSubjectCodes: [subjectCode],
        programmeCodes: [programmeCode],
        subjectMappings: [{
          programmeCode,
          departmentCode: subject?.departmentCode ?? programmeCode.replace(/^D/, ''),
          schemeCode: 'R23',
          semesterNumber: candidate.officialSemesterNumber,
          subjectCode,
          subjectName: subject?.subjectName ?? null,
          subjectVerificationStatus: 'official_unit_reconciled_pending_academic_review',
          curriculumManifest: input.reconciliation.officialCurriculumSource,
          lessonSlug: candidate.officialLessonSlug,
          unitNumber: candidate.officialUnitNumber,
          mappingStatus: 'ready_for_lesson_mapping_review' as const,
          blockers: [],
        }],
        reviewRequired: unique([
          ...candidate.reviewChecklist,
          'Confirm the official lesson title, unit number, and video coverage before approval.',
          'Confirm public availability, embeddability, and a useful viewing range before promotion.',
        ]),
        publicationStatus: 'draft' as const,
      }
    })
    .sort((left, right) =>
      (left.subjectMappings[0]?.semesterNumber ?? 99) - (right.subjectMappings[0]?.semesterNumber ?? 99) ||
      (left.subjectMappings[0]?.subjectCode ?? '').localeCompare(right.subjectMappings[0]?.subjectCode ?? '') ||
      (left.officialLesson.unitNumber - right.officialLesson.unitNumber),
    )

  const mappedLessons = new Set(items.map((item) => {
    const mapping = item.subjectMappings[0]!
    return `${mapping.programmeCode}:${mapping.subjectCode}:${mapping.lessonSlug}`
  }))
  const coverageGaps = Math.max(0, input.reconciliation.summary.officialLessons - mappedLessons.size)

  return {
    manifestVersion: 2,
    status: 'draft',
    verificationStatus: 'candidate_mapping_review_required',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceCandidateManifest: input.reconciliation.source,
    curriculumManifestCount: 12,
    safetyNote:
      'These are direct-video candidates mapped to official CWIT R23 units. They remain hidden from students until a named reviewer verifies lesson fit, language, availability and embeddability, then promotes them.',
    learningCoverage: {
      officialLessons: input.reconciliation.summary.officialLessons,
      lessonCandidatesReadyForReview: items.length,
      lessonsWithoutCandidate: coverageGaps,
      unmatchedResearchCandidates: input.reconciliation.summary.unmatchedCandidates,
    },
    totals: {
      candidates: items.length,
      videos: items.length,
      playlists: 0,
      subjectMappings: items.length,
      readyForLessonMappingReview: items.length,
      blockedMissingManifestSubject: 0,
      blockedUnplacedOfficialSubject: 0,
      blockedMissingLessonStructure: 0,
      oembedFound: 0,
      playlistRequiresManualOrApiReview: 0,
      embeddableCandidates: 0,
      draftOnly: items.length,
    },
    items,
  }
}

function subjectKey(programmeCode: string, subjectCode: string) {
  return `${programmeCode.trim().toUpperCase()}:${subjectCode.trim().toUpperCase()}`
}

function stableId(value: string) {
  return createHash('sha256').update(value).digest('hex').slice(0, 16)
}

function unique(values: string[]) {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
