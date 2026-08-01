import { z } from 'zod'
import { normalizeLessonResourceRole, type LessonResourceRole } from './lesson-resource-policy'

export const YOUTUBE_CANDIDATE_REVIEW_QUEUE_VERSION = 1

const ResourceKindSchema = z.enum(['video', 'playlist'])

const CandidateMetadataSchema = z.object({
  metadataStatus: z.string().nullable().optional(),
  title: z.string().nullable().optional(),
  channel: z.string().nullable().optional(),
  channelUrl: z.string().nullable().optional(),
  thumbnailUrl: z.string().nullable().optional(),
  availabilityStatus: z.string().nullable().optional(),
  embeddable: z.boolean().nullable().optional(),
  embeddabilityStatus: z.string().nullable().optional(),
  checkedAt: z.string().nullable().optional(),
  durationSeconds: z.number().int().nonnegative().nullable().optional(),
}).passthrough()

const YouTubeCandidateSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourcePage: z.number().int().positive().nullable().optional(),
  sourcePdf: z.string().min(1).nullable().optional(),
  originalUrl: z.string().min(1),
  canonicalUrl: z.string().min(1),
  resourceKind: ResourceKindSchema,
  externalId: z.string().min(1),
  videoId: z.string().nullable().optional(),
  playlistId: z.string().nullable().optional(),
  role: z.string().min(1),
  subjectTitle: z.string().min(1).nullable().optional(),
  officialSubjectCodes: z.array(z.string().min(1)).default([]),
  programmeCodes: z.array(z.string().min(1)).default([]),
  verificationStatus: z.string().min(1).default('pending_metadata_verification'),
  publicationStatus: z.string().min(1).default('draft'),
  metadata: CandidateMetadataSchema.nullable().optional(),
}).passthrough()

export const YouTubeCandidateManifestSchema = z.object({
  manifestVersion: z.number().int().positive(),
  status: z.string().min(1),
  verificationStatus: z.string().min(1),
  generatedAt: z.string().min(1),
  sourceHierarchyNote: z.string().nullable().optional(),
  candidates: z.array(YouTubeCandidateSchema),
}).passthrough()

const CurriculumSubjectSchema = z.object({
  officialSubjectCode: z.string().min(1),
  name: z.string().min(1),
  units: z.array(z.unknown()).default([]),
  outcomes: z.array(z.unknown()).default([]),
  verificationStatus: z.string().min(1),
}).passthrough()

export const CurriculumManifestForReviewSchema = z.object({
  departmentCode: z.string().min(1),
  programmeCode: z.string().min(1),
  schemeCode: z.string().min(1),
  semesterNumber: z.number().int().positive(),
  verificationStatus: z.string().min(1),
  subjects: z.array(CurriculumSubjectSchema),
}).passthrough()

export type YouTubeCandidateManifest = z.infer<typeof YouTubeCandidateManifestSchema>
export type YouTubeCandidate = z.infer<typeof YouTubeCandidateSchema>
export type CandidateMetadata = z.infer<typeof CandidateMetadataSchema>
export type CurriculumManifestForReview = z.infer<typeof CurriculumManifestForReviewSchema>
export type CurriculumSubjectForReview = z.infer<typeof CurriculumSubjectSchema>

export type CandidateMappingStatus =
  | 'blocked_missing_manifest_subject'
  | 'blocked_unplaced_official_subject'
  | 'blocked_missing_lesson_structure'
  | 'ready_for_lesson_mapping_review'

export interface BuildYouTubeCandidateReviewQueueInput {
  candidateManifest: unknown
  curriculumManifests: unknown[]
  officialCourseCatalog?: unknown
  generatedAt?: string
  candidateManifestPath?: string
  curriculumManifestPaths?: string[]
}

export interface YouTubeCandidateSubjectMapping {
  programmeCode: string | null
  departmentCode: string | null
  schemeCode: string | null
  semesterNumber: number | null
  subjectCode: string
  subjectName: string | null
  subjectVerificationStatus: string | null
  curriculumManifest: string | null
  lessonSlug: string | null
  unitNumber: number | null
  mappingStatus: CandidateMappingStatus
  blockers: string[]
}

export interface YouTubeCandidateReviewItem {
  candidateId: string
  role: LessonResourceRole
  resourceKind: 'video' | 'playlist'
  originalUrl: string
  canonicalUrl: string
  externalId: string
  videoId: string | null
  playlistId: string | null
  title: string | null
  channel: string | null
  thumbnailUrl: string | null
  embeddable: boolean | null
  metadataStatus: string
  availabilityStatus: string
  language?: 'en' | 'hi' | 'hinglish'
  officialLesson?: {
    slug: string
    title: string
    unitNumber: number
    matchedTerms: string[]
    reconciliationScore: number
  }
  sourceEvidence: {
    sourceId: string
    sourcePdf: string | null
    sourcePage: number | null
  }
  officialSubjectCodes: string[]
  programmeCodes: string[]
  subjectMappings: YouTubeCandidateSubjectMapping[]
  reviewRequired: string[]
  publicationStatus: 'draft'
}

export interface YouTubeCandidateReviewQueue {
  manifestVersion: number
  status: 'draft'
  verificationStatus: 'candidate_mapping_review_required'
  generatedAt: string
  sourceCandidateManifest: string | null
  curriculumManifestCount: number
  safetyNote: string
  learningCoverage?: {
    officialLessons: number
    lessonCandidatesReadyForReview: number
    lessonsWithoutCandidate: number
    unmatchedResearchCandidates: number
  }
  totals: {
    candidates: number
    videos: number
    playlists: number
    subjectMappings: number
    readyForLessonMappingReview: number
    blockedMissingManifestSubject: number
    blockedUnplacedOfficialSubject: number
    blockedMissingLessonStructure: number
    oembedFound: number
    playlistRequiresManualOrApiReview: number
    embeddableCandidates: number
    draftOnly: number
  }
  items: YouTubeCandidateReviewItem[]
}

interface SubjectIndexEntry {
  subject: CurriculumSubjectForReview
  manifest: CurriculumManifestForReview
  manifestPath: string | null
}

interface OfficialCourseCatalogEntry {
  departmentCode: string
  courseCode: string
  courseName: string
}

export function buildYouTubeCandidateReviewQueue(
  input: BuildYouTubeCandidateReviewQueueInput,
): YouTubeCandidateReviewQueue {
  const candidateManifest = YouTubeCandidateManifestSchema.parse(input.candidateManifest)
  const manifests = input.curriculumManifests.map((manifest) => CurriculumManifestForReviewSchema.parse(manifest))
  const index = buildSubjectIndex(manifests, input.curriculumManifestPaths ?? [])
  const officialCourseCatalog = buildOfficialCourseCatalog(input.officialCourseCatalog)

  const items = candidateManifest.candidates
    .map((candidate) => toReviewItem(candidate, index, officialCourseCatalog))
    .sort((a, b) =>
      firstSemester(a) - firstSemester(b) ||
      firstSubjectCode(a).localeCompare(firstSubjectCode(b)) ||
      a.role.localeCompare(b.role) ||
      a.candidateId.localeCompare(b.candidateId),
    )

  const subjectMappings = items.flatMap((item) => item.subjectMappings)

  return {
    manifestVersion: YOUTUBE_CANDIDATE_REVIEW_QUEUE_VERSION,
    status: 'draft',
    verificationStatus: 'candidate_mapping_review_required',
    generatedAt: input.generatedAt ?? new Date().toISOString(),
    sourceCandidateManifest: input.candidateManifestPath ?? null,
    curriculumManifestCount: manifests.length,
    safetyNote:
      'These rows are reviewer candidates only. They must not be shown to students until metadata, lesson mapping and publication review are complete.',
    totals: {
      candidates: items.length,
      videos: items.filter((item) => item.resourceKind === 'video').length,
      playlists: items.filter((item) => item.resourceKind === 'playlist').length,
      subjectMappings: subjectMappings.length,
      readyForLessonMappingReview: subjectMappings.filter((mapping) => mapping.mappingStatus === 'ready_for_lesson_mapping_review').length,
      blockedMissingManifestSubject: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_missing_manifest_subject').length,
      blockedUnplacedOfficialSubject: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_unplaced_official_subject').length,
      blockedMissingLessonStructure: subjectMappings.filter((mapping) => mapping.mappingStatus === 'blocked_missing_lesson_structure').length,
      oembedFound: items.filter((item) => item.metadataStatus === 'found').length,
      playlistRequiresManualOrApiReview: items.filter((item) => item.resourceKind === 'playlist').length,
      embeddableCandidates: items.filter((item) => item.embeddable === true).length,
      draftOnly: items.length,
    },
    items,
  }
}

function toReviewItem(
  candidate: YouTubeCandidate,
  index: Map<string, SubjectIndexEntry[]>,
  officialCourseCatalog: Map<string, OfficialCourseCatalogEntry>,
): YouTubeCandidateReviewItem {
  const role = normalizeLessonResourceRole(candidate.role)
  if (!role) {
    throw new Error(`${candidate.id}: Unsupported lesson resource role "${candidate.role}".`)
  }

  const subjectCodes = unique(candidate.officialSubjectCodes)
  const subjectMappings = subjectCodes.flatMap((subjectCode) =>
    buildSubjectMappings(subjectCode, index, officialCourseCatalog),
  )
  const metadata = candidate.metadata ?? null

  return {
    candidateId: candidate.id,
    role,
    resourceKind: candidate.resourceKind,
    originalUrl: candidate.originalUrl,
    canonicalUrl: candidate.canonicalUrl,
    externalId: candidate.externalId,
    videoId: candidate.videoId ?? null,
    playlistId: candidate.playlistId ?? null,
    title: metadata?.title ?? null,
    channel: metadata?.channel ?? null,
    thumbnailUrl: metadata?.thumbnailUrl ?? null,
    embeddable: metadata?.embeddable ?? null,
    metadataStatus: metadata?.metadataStatus ?? candidate.verificationStatus,
    availabilityStatus: metadata?.availabilityStatus ?? 'unchecked',
    sourceEvidence: {
      sourceId: candidate.sourceId,
      sourcePdf: candidate.sourcePdf ?? null,
      sourcePage: candidate.sourcePage ?? null,
    },
    officialSubjectCodes: subjectCodes,
    programmeCodes: unique(candidate.programmeCodes),
    subjectMappings,
    reviewRequired: reviewRequirements(candidate, subjectMappings, metadata),
    publicationStatus: 'draft',
  }
}

function buildSubjectMappings(
  subjectCode: string,
  index: Map<string, SubjectIndexEntry[]>,
  officialCourseCatalog: Map<string, OfficialCourseCatalogEntry>,
): YouTubeCandidateSubjectMapping[] {
  const matches = index.get(subjectCode) ?? []
  if (matches.length === 0) {
    const catalogEntry = officialCourseCatalog.get(subjectCode.toUpperCase())
    if (catalogEntry) {
      return [{
        programmeCode: null,
        departmentCode: catalogEntry.departmentCode,
        schemeCode: null,
        semesterNumber: null,
        subjectCode,
        subjectName: catalogEntry.courseName,
        subjectVerificationStatus: 'official_course_catalog_only',
        curriculumManifest: null,
        lessonSlug: null,
        unitNumber: null,
        mappingStatus: 'blocked_unplaced_official_subject',
        blockers: ['Official course catalog contains this code, but no local semester manifest places it.'],
      }]
    }

    return [{
      programmeCode: null,
      departmentCode: null,
      schemeCode: null,
      semesterNumber: null,
      subjectCode,
      subjectName: null,
      subjectVerificationStatus: null,
      curriculumManifest: null,
      lessonSlug: null,
      unitNumber: null,
      mappingStatus: 'blocked_missing_manifest_subject',
      blockers: ['No local curriculum manifest subject matches this official subject code.'],
    }]
  }

  return matches.map(({ subject, manifest, manifestPath }) => {
    const hasLessonStructure = subjectHasLessonStructure(subject)
    return {
      programmeCode: manifest.programmeCode,
      departmentCode: manifest.departmentCode,
      schemeCode: manifest.schemeCode,
      semesterNumber: manifest.semesterNumber,
      subjectCode,
      subjectName: subject.name,
      subjectVerificationStatus: subject.verificationStatus,
      curriculumManifest: manifestPath,
      lessonSlug: null,
      unitNumber: null,
      mappingStatus: hasLessonStructure ? 'ready_for_lesson_mapping_review' : 'blocked_missing_lesson_structure',
      blockers: hasLessonStructure
        ? []
        : ['Subject exists, but verified units/topics/lessons are not present for lesson-level video mapping.'],
    }
  })
}

function reviewRequirements(
  candidate: YouTubeCandidate,
  subjectMappings: YouTubeCandidateSubjectMapping[],
  metadata: CandidateMetadata | null,
): string[] {
  const requirements: string[] = []

  if (candidate.resourceKind === 'playlist') {
    requirements.push('Playlist requires YouTube Data API or manual review before metadata can be trusted.')
  }
  if ((metadata?.metadataStatus ?? '') !== 'found') {
    requirements.push('Current public metadata check did not verify a direct embeddable video.')
  }
  if (metadata?.embeddable !== true) {
    requirements.push('Embeddability has not been reviewer-approved.')
  }
  if (subjectMappings.some((mapping) => mapping.mappingStatus === 'blocked_missing_manifest_subject')) {
    requirements.push('At least one subject code is absent from verified local manifests.')
  }
  if (subjectMappings.some((mapping) => mapping.mappingStatus === 'blocked_unplaced_official_subject')) {
    requirements.push('At least one official subject code is unplaced until a semester manifest is obtained.')
  }
  if (subjectMappings.some((mapping) => mapping.mappingStatus === 'blocked_missing_lesson_structure')) {
    requirements.push('Verified lesson structure is required before creating LessonResource rows.')
  }

  return unique(requirements)
}

function buildSubjectIndex(
  manifests: CurriculumManifestForReview[],
  manifestPaths: string[],
): Map<string, SubjectIndexEntry[]> {
  const index = new Map<string, SubjectIndexEntry[]>()
  manifests.forEach((manifest, manifestIndex) => {
    manifest.subjects.forEach((subject) => {
      const entry: SubjectIndexEntry = {
        subject,
        manifest,
        manifestPath: manifestPaths[manifestIndex] ?? null,
      }
      const existing = index.get(subject.officialSubjectCode) ?? []
      existing.push(entry)
      index.set(subject.officialSubjectCode, existing)
    })
  })
  return index
}

function buildOfficialCourseCatalog(raw: unknown): Map<string, OfficialCourseCatalogEntry> {
  if (!isRecord(raw) || !Array.isArray(raw.catalogEntries)) return new Map()

  const catalog = new Map<string, OfficialCourseCatalogEntry>()
  raw.catalogEntries.forEach((entry) => {
    if (!isRecord(entry)) return
    const courseCode = stringValue(entry.courseCode)
    const courseName = stringValue(entry.courseName)
    const departmentCode = stringValue(entry.departmentCode)
    if (!courseCode || !courseName || !departmentCode) return
    catalog.set(courseCode.toUpperCase(), { courseCode, courseName, departmentCode })
  })
  return catalog
}

function subjectHasLessonStructure(subject: CurriculumSubjectForReview): boolean {
  return subject.units.some((unit) => unitHasLessonStructure(unit))
}

function unitHasLessonStructure(unit: unknown): boolean {
  if (!isRecord(unit)) return false
  if (hasNonEmptyArray(unit.lessons)) return true
  if (hasNonEmptyArray(unit.topics)) {
    return unit.topics.some((topic) => {
      if (!isRecord(topic)) return false
      return hasNonEmptyArray(topic.lessons) || hasNonEmptyArray(topic.objectives)
    })
  }
  return false
}

function hasNonEmptyArray(value: unknown): value is unknown[] {
  return Array.isArray(value) && value.length > 0
}

function firstSemester(item: YouTubeCandidateReviewItem): number {
  return item.subjectMappings.find((mapping) => mapping.semesterNumber !== null)?.semesterNumber ?? 99
}

function firstSubjectCode(item: YouTubeCandidateReviewItem): string {
  return item.officialSubjectCodes[0] ?? ''
}

function unique(values: string[]): string[] {
  return [...new Set(values.map((value) => value.trim()).filter(Boolean))]
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
