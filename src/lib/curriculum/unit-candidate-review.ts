import { z } from 'zod'

export const OFFICIAL_UNIT_CANDIDATE_REVIEW_QUEUE_VERSION = 1

const UnitCandidateSchema = z.object({
  order: z.number().int().positive(),
  rawLabel: z.string(),
  title: z.string().min(1),
  source: z.enum(['summary_table', 'course_content']),
})

const UnitQualitySchema = z.object({
  promotable: z.boolean(),
  blockers: z.array(z.string()),
})

const OfficialStructureSubjectSchema = z.object({
  manifest: z.string().min(1),
  departmentCode: z.string().min(1),
  programmeCode: z.string().min(1),
  semesterNumber: z.number().int().positive(),
  officialSubjectCode: z.string().min(1),
  subjectName: z.string().min(1),
  sourcePages: z.array(z.number().int().positive()),
  candidateUnits: z.array(UnitCandidateSchema),
  unitQuality: UnitQualitySchema,
  extractionStatus: z.enum(['course_block_not_found', 'needs_review', 'structure_promotable', 'missing_curriculum_text']),
}).passthrough()

export const OfficialStructureExtractionReportSchema = z.object({
  generatedAt: z.string().min(1),
  status: z.string().min(1),
  totals: z.object({
    subjects: z.number().int().nonnegative(),
    subjectsWithUnitCandidates: z.number().int().nonnegative(),
    subjectsWithPromotableUnitCandidates: z.number().int().nonnegative(),
  }).passthrough(),
  subjects: z.array(OfficialStructureSubjectSchema),
}).passthrough()

export type OfficialUnitCandidate = z.infer<typeof UnitCandidateSchema>
export type OfficialStructureSubject = z.infer<typeof OfficialStructureSubjectSchema>
export type OfficialStructureExtractionReport = z.infer<typeof OfficialStructureExtractionReportSchema>

export type UnitCandidateReviewStatus =
  | 'blocked_missing_course_block'
  | 'blocked_no_unit_candidates'
  | 'needs_manual_unit_review'
  | 'ready_for_unit_promotion_review'

export interface UnitCandidateReviewItem {
  manifest: string
  departmentCode: string
  programmeCode: string
  semesterNumber: number
  officialSubjectCode: string
  subjectName: string
  sourcePages: number[]
  extractionStatus: OfficialStructureSubject['extractionStatus']
  candidateUnitCount: number
  candidateUnits: OfficialUnitCandidate[]
  reviewStatus: UnitCandidateReviewStatus
  blockers: string[]
  reviewRequired: string[]
  publicationStatus: 'draft' | 'ready_for_reviewer_promotion'
}

export interface OfficialUnitCandidateReviewQueue {
  manifestVersion: number
  status: 'draft'
  verificationStatus: 'official_unit_candidate_review_required'
  generatedAt: string
  sourceExtractionReport: string | null
  safetyNote: string
  totals: {
    subjects: number
    subjectsWithUnitCandidates: number
    readyForUnitPromotionReview: number
    needsManualUnitReview: number
    blockedMissingCourseBlock: number
    blockedNoUnitCandidates: number
    draftOnly: number
  }
  items: UnitCandidateReviewItem[]
}

export function buildOfficialUnitCandidateReviewQueue(input: {
  extractionReport: unknown
  generatedAt?: string
  sourceExtractionReport?: string
}): OfficialUnitCandidateReviewQueue {
  const report = OfficialStructureExtractionReportSchema.parse(input.extractionReport)
  const items = report.subjects
    .map(toReviewItem)
    .sort((a, b) =>
      a.programmeCode.localeCompare(b.programmeCode) ||
      a.semesterNumber - b.semesterNumber ||
      a.officialSubjectCode.localeCompare(b.officialSubjectCode),
    )

  return {
    manifestVersion: OFFICIAL_UNIT_CANDIDATE_REVIEW_QUEUE_VERSION,
    status: 'draft',
    verificationStatus: 'official_unit_candidate_review_required',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceExtractionReport: input.sourceExtractionReport ?? null,
    safetyNote:
      'These unit candidates are official-PDF extraction review rows only. They must not be imported into manifests or shown to students until a reviewer verifies order, title text and source pages.',
    totals: {
      subjects: items.length,
      subjectsWithUnitCandidates: items.filter((item) => item.candidateUnitCount > 0).length,
      readyForUnitPromotionReview: items.filter((item) => item.reviewStatus === 'ready_for_unit_promotion_review').length,
      needsManualUnitReview: items.filter((item) => item.reviewStatus === 'needs_manual_unit_review').length,
      blockedMissingCourseBlock: items.filter((item) => item.reviewStatus === 'blocked_missing_course_block').length,
      blockedNoUnitCandidates: items.filter((item) => item.reviewStatus === 'blocked_no_unit_candidates').length,
      draftOnly: items.filter((item) => item.publicationStatus === 'draft').length,
    },
    items,
  }
}

function toReviewItem(subject: OfficialStructureSubject): UnitCandidateReviewItem {
  const reviewStatus = reviewStatusFor(subject)
  return {
    manifest: subject.manifest,
    departmentCode: subject.departmentCode,
    programmeCode: subject.programmeCode,
    semesterNumber: subject.semesterNumber,
    officialSubjectCode: subject.officialSubjectCode,
    subjectName: subject.subjectName,
    sourcePages: subject.sourcePages,
    extractionStatus: subject.extractionStatus,
    candidateUnitCount: subject.candidateUnits.length,
    candidateUnits: subject.candidateUnits,
    reviewStatus,
    blockers: subject.unitQuality.blockers,
    reviewRequired: reviewRequirements(subject, reviewStatus),
    publicationStatus: reviewStatus === 'ready_for_unit_promotion_review'
      ? 'ready_for_reviewer_promotion'
      : 'draft',
  }
}

function reviewStatusFor(subject: OfficialStructureSubject): UnitCandidateReviewStatus {
  if (subject.extractionStatus === 'course_block_not_found' || subject.extractionStatus === 'missing_curriculum_text') {
    return 'blocked_missing_course_block'
  }
  if (subject.candidateUnits.length === 0) return 'blocked_no_unit_candidates'
  if (subject.unitQuality.promotable) return 'ready_for_unit_promotion_review'
  return 'needs_manual_unit_review'
}

function reviewRequirements(
  subject: OfficialStructureSubject,
  reviewStatus: UnitCandidateReviewStatus,
): string[] {
  if (reviewStatus === 'ready_for_unit_promotion_review') {
    return ['Reviewer must compare unit order and titles against the official PDF pages before promotion.']
  }

  const requirements = [...subject.unitQuality.blockers]
  if (reviewStatus === 'blocked_missing_course_block') {
    requirements.push('Official course block was not extracted for this subject; locate the source pages manually.')
  }
  if (reviewStatus === 'blocked_no_unit_candidates') {
    requirements.push('No unit titles were extracted; reviewer must inspect the official PDF pages manually.')
  }
  return unique(requirements)
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}
