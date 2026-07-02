import type { DatabaseLearningCoverageSnapshot } from './database-coverage-report'

export interface CurriculumCoverageReport {
  generatedAt: string
  schemeCode: string
  sourceNote: string
  totals: CoverageTotals
  programmes: ProgrammeCoverage[]
  databaseCoverage?: DatabaseLearningCoverageSnapshot
  databaseCoverageUnavailable?: DatabaseCoverageUnavailable
}

export interface DatabaseCoverageUnavailable {
  status: 'unavailable'
  checkedAt: string
  errorName: string
  message: string
}

export interface CoverageTotals {
  programmes: number
  semesters: number
  manifestsPresent: number
  subjects: number
  subjectsWithUnits: number
  subjectsWithOutcomes: number
  units: number
  topics: number
  lessons: number
  lessonsWithPrimaryVideo: number
  lessonsWithApprovedPdf: number
  lessonsWithPractice: number
  brokenResources: number
  pendingVerification: number
  youtubeCandidates: number
  youtubeMetadataFound: number
  youtubePlaylistsRequireReview: number
  youtubeReviewQueueCandidates: number
  youtubeReviewQueueSubjectMappings: number
  youtubeReviewQueueReadyForLessonMapping: number
  youtubeReviewQueueBlockedMissingManifestSubject: number
  youtubeReviewQueueBlockedUnplacedOfficialSubject: number
  youtubeReviewQueueBlockedMissingLessonStructure: number
  linkHealthChecked: number
  linkHealthHealthy: number
  linkHealthUnknown: number
  officialTimetableEvidenceAppearances: number
  officialTimetableEvidenceCodes: number
  officialTimetableEvidencePublicationReady: number
  officialCourseCatalogCourses: number
  officialCourseCatalogManifestSubjectCodes: number
  officialCourseCatalogUnplacedCourses: number
  officialCourseCatalogCompUnplaced: number
  officialCourseCatalogCiotUnplaced: number
  officialUnitReviewSubjects: number
  officialUnitReviewSubjectsWithCandidates: number
  officialUnitReviewReadyForPromotion: number
  officialUnitReviewNeedsManualReview: number
  officialUnitReviewBlocked: number
}

export interface ProgrammeCoverage {
  programme: string
  department: string
  semesters: SemesterCoverage[]
}

export interface SemesterCoverage {
  programme: string
  department: string
  semester: number
  manifestStatus: 'present' | 'missing_manifest'
  verificationStatus: string
  subjects: number
  units: number
  topics: number
  lessons: number
  lessonsWithPrimaryVideo: number
  lessonsWithApprovedPdf: number
  lessonsWithPractice: number
  brokenResources: number
  pendingVerification: number
  pendingCurriculumVerification: number
  pendingResourceVerification: number
  youtubeCandidates: number
  youtubeMetadataFound: number
  youtubePlaylistsRequireReview: number
  linkHealthChecked: number
  linkHealthHealthy: number
  linkHealthUnknown: number
  subjectsWithUnits: number
  subjectsWithOutcomes: number
  subjectCodes: string[]
  notes: string[]
}

interface RawManifest {
  departmentCode?: unknown
  programmeCode?: unknown
  schemeCode?: unknown
  semesterNumber?: unknown
  verificationStatus?: unknown
  subjects?: unknown
}

interface RawSubject {
  officialSubjectCode?: unknown
  verificationStatus?: unknown
  units?: unknown
  outcomes?: unknown
}

interface RawUnit {
  topics?: unknown
  lessons?: unknown
}

interface RawTopic {
  lessons?: unknown
}

interface RawYouTubeMetadata {
  candidates?: unknown
}

interface RawYouTubeCandidate {
  officialSubjectCodes?: unknown
  programmeCodes?: unknown
  publicationStatus?: unknown
  metadata?: {
    metadataStatus?: unknown
    availabilityStatus?: unknown
  } | unknown
}

interface RawLinkHealthReport {
  resources?: unknown
}

interface RawLinkHealthResource {
  officialSubjectCodes?: unknown
  programmeCodes?: unknown
  status?: unknown
}

interface RawYouTubeReviewQueue {
  totals?: {
    candidates?: unknown
    subjectMappings?: unknown
    readyForLessonMappingReview?: unknown
    blockedMissingManifestSubject?: unknown
    blockedUnplacedOfficialSubject?: unknown
    blockedMissingLessonStructure?: unknown
  } | unknown
}

interface RawOfficialTimetableEvidence {
  totals?: {
    appearances?: unknown
    uniqueCodes?: unknown
    publicationReadySemesterManifests?: unknown
  } | unknown
}

interface RawOfficialCourseCatalog {
  totals?: {
    officialCourses?: unknown
    manifestSubjectCodes?: unknown
    unplacedOfficialCourses?: unknown
    compUnplacedOfficialCourses?: unknown
    ciotUnplacedOfficialCourses?: unknown
  } | unknown
}

interface RawOfficialUnitReviewQueue {
  totals?: {
    subjects?: unknown
    subjectsWithUnitCandidates?: unknown
    readyForUnitPromotionReview?: unknown
    needsManualUnitReview?: unknown
    blockedMissingCourseBlock?: unknown
    blockedNoUnitCandidates?: unknown
  } | unknown
}

const TARGET_PROGRAMMES = [
  { programme: 'DCOMP', department: 'COMP' },
  { programme: 'DCIOT', department: 'CIOT' },
] as const

const COMPLETE_CURRICULUM_STATUSES = new Set(['content_verified', 'published'])

export function buildCwitR23CoverageReport(input: {
  manifests: unknown[]
  youtubeMetadata?: unknown
  youtubeReviewQueue?: unknown
  linkHealthReport?: unknown
  officialTimetableEvidence?: unknown
  officialCourseCatalog?: unknown
  officialUnitReviewQueue?: unknown
  databaseCoverage?: DatabaseLearningCoverageSnapshot
  databaseCoverageUnavailable?: DatabaseCoverageUnavailable
  generatedAt: string
}): CurriculumCoverageReport {
  const manifests = input.manifests.filter(isRecord) as RawManifest[]
  const youtubeCandidates = candidatesFromMetadata(input.youtubeMetadata)
  const youtubeReviewQueueTotals = reviewQueueTotals(input.youtubeReviewQueue)
  const officialTimetableEvidenceTotals = timetableEvidenceTotals(input.officialTimetableEvidence)
  const officialCourseCatalogTotals = courseCatalogTotals(input.officialCourseCatalog)
  const officialUnitReviewTotals = unitReviewTotals(input.officialUnitReviewQueue)
  const linkHealthResources = resourcesFromLinkHealthReport(input.linkHealthReport)
  const programmes = TARGET_PROGRAMMES.map((target) => ({
    programme: target.programme,
    department: target.department,
    semesters: Array.from({ length: 6 }, (_, index) => {
      const semester = index + 1
      const manifest = manifests.find((item) =>
        stringValue(item.programmeCode) === target.programme &&
        numberValue(item.semesterNumber) === semester,
      )
      return buildSemesterCoverage({
        target,
        semester,
        manifest,
        youtubeCandidates,
        linkHealthResources,
      })
    }),
  }))

  return {
    generatedAt: input.generatedAt,
    schemeCode: 'R23',
    sourceNote: input.databaseCoverage
      ? 'Coverage is calculated from local curriculum manifests, draft YouTube metadata, and an attached database-backed publication snapshot.'
      : 'Coverage is calculated from local curriculum manifests and draft YouTube metadata. Run coverage:learning with --with-db to attach database-backed published lesson/resource counts when PostgreSQL is reachable.',
    totals: {
      ...programmes.flatMap((programme) => programme.semesters).reduce(addSemesterToTotals, emptyTotals()),
      ...youtubeReviewQueueTotals,
      ...officialTimetableEvidenceTotals,
      ...officialCourseCatalogTotals,
      ...officialUnitReviewTotals,
    },
    programmes,
    ...(input.databaseCoverage ? { databaseCoverage: input.databaseCoverage } : {}),
    ...(input.databaseCoverageUnavailable ? { databaseCoverageUnavailable: input.databaseCoverageUnavailable } : {}),
  }
}

function buildSemesterCoverage(input: {
  target: { programme: string; department: string }
  semester: number
  manifest: RawManifest | undefined
  youtubeCandidates: RawYouTubeCandidate[]
  linkHealthResources: RawLinkHealthResource[]
}): SemesterCoverage {
  if (!input.manifest) {
    return {
      programme: input.target.programme,
      department: input.target.department,
      semester: input.semester,
      manifestStatus: 'missing_manifest',
      verificationStatus: 'missing_manifest',
      subjects: 0,
      units: 0,
      topics: 0,
      lessons: 0,
      lessonsWithPrimaryVideo: 0,
      lessonsWithApprovedPdf: 0,
      lessonsWithPractice: 0,
      brokenResources: 0,
      pendingVerification: 1,
      pendingCurriculumVerification: 1,
      pendingResourceVerification: 0,
      youtubeCandidates: 0,
      youtubeMetadataFound: 0,
      youtubePlaylistsRequireReview: 0,
      linkHealthChecked: 0,
      linkHealthHealthy: 0,
      linkHealthUnknown: 0,
      subjectsWithUnits: 0,
      subjectsWithOutcomes: 0,
      subjectCodes: [],
      notes: ['Official R23 manifest has not been added for this semester.'],
    }
  }

  const subjects = arrayValue(input.manifest.subjects).filter(isRecord) as RawSubject[]
  const subjectCodes = subjects
    .map((subject) => stringValue(subject.officialSubjectCode))
    .filter((code): code is string => Boolean(code))
    .sort()
  const subjectCodeSet = new Set(subjectCodes)
  const matchingCandidates = input.youtubeCandidates.filter((candidate) =>
    arrayValue(candidate.programmeCodes).includes(input.target.programme) &&
    arrayValue(candidate.officialSubjectCodes).some((code) => subjectCodeSet.has(String(code))),
  )
  const matchingLinkHealth = input.linkHealthResources.filter((resource) =>
    arrayValue(resource.programmeCodes).includes(input.target.programme) &&
    arrayValue(resource.officialSubjectCodes).some((code) => subjectCodeSet.has(String(code))),
  )
  const unitCounts = subjects.map(countSubjectUnits)
  const topicCounts = subjects.map(countSubjectTopics)
  const lessonCounts = subjects.map(countSubjectLessons)
  const emptyBlockedManifest = subjects.length === 0 && stringValue(input.manifest.verificationStatus) === 'needs_official_source'
  const pendingCurriculumVerification = emptyBlockedManifest
    ? 1
    : subjects.filter((subject) =>
        !COMPLETE_CURRICULUM_STATUSES.has(stringValue(subject.verificationStatus) ?? ''),
      ).length
  const pendingResourceVerification = matchingCandidates.filter((candidate) =>
    stringValue(candidate.publicationStatus) !== 'published',
  ).length

  return {
    programme: input.target.programme,
    department: input.target.department,
    semester: input.semester,
    manifestStatus: 'present',
    verificationStatus: stringValue(input.manifest.verificationStatus) ?? 'unknown',
    subjects: subjects.length,
    units: sum(unitCounts),
    topics: sum(topicCounts),
    lessons: sum(lessonCounts),
    lessonsWithPrimaryVideo: 0,
    lessonsWithApprovedPdf: 0,
    lessonsWithPractice: 0,
    brokenResources: matchingLinkHealth.filter((resource) =>
      ['stale', 'unhealthy'].includes(stringValue(resource.status) ?? ''),
    ).length,
    pendingVerification: pendingCurriculumVerification + pendingResourceVerification,
    pendingCurriculumVerification,
    pendingResourceVerification,
    youtubeCandidates: matchingCandidates.length,
    youtubeMetadataFound: matchingCandidates.filter((candidate) =>
      stringValue(metadataFor(candidate).metadataStatus) === 'found',
    ).length,
    youtubePlaylistsRequireReview: matchingCandidates.filter((candidate) =>
      stringValue(metadataFor(candidate).availabilityStatus) === 'playlist_requires_youtube_data_api_or_manual_review',
    ).length,
    linkHealthChecked: matchingLinkHealth.length,
    linkHealthHealthy: matchingLinkHealth.filter((resource) => stringValue(resource.status) === 'healthy').length,
    linkHealthUnknown: matchingLinkHealth.filter((resource) => stringValue(resource.status) === 'unknown').length,
    subjectsWithUnits: subjects.filter((subject) => countSubjectUnits(subject) > 0).length,
    subjectsWithOutcomes: subjects.filter((subject) => arrayValue(subject.outcomes).length > 0).length,
    subjectCodes,
    notes: notesForSemester({
      subjects,
      matchingCandidates,
      pendingCurriculumVerification,
      pendingResourceVerification,
      emptyBlockedManifest,
    }),
  }
}

function notesForSemester(input: {
  subjects: RawSubject[]
  matchingCandidates: RawYouTubeCandidate[]
  pendingCurriculumVerification: number
  pendingResourceVerification: number
  emptyBlockedManifest: boolean
}) {
  const notes: string[] = []
  if (input.emptyBlockedManifest) {
    notes.push('Manifest is present only as an explicit blocker; official semester-placement evidence is still required before subjects can be added.')
  }
  if (input.subjects.length > 0 && input.subjects.every((subject) => countSubjectUnits(subject) === 0)) {
    notes.push('Subject structure is present, but units/topics/lessons are not promoted into the manifest yet.')
  }
  if (input.pendingCurriculumVerification > 0) {
    notes.push('Curriculum rows still require content-level official verification before publication.')
  }
  if (input.pendingResourceVerification > 0) {
    notes.push('YouTube candidates are metadata-checked drafts only and are not published LessonResource mappings.')
  }
  if (input.matchingCandidates.length === 0) {
    notes.push('No candidate YouTube resources are currently associated with these subject codes.')
  }
  return notes
}

function addSemesterToTotals(totals: CoverageTotals, semester: SemesterCoverage): CoverageTotals {
  return {
    programmes: totals.programmes,
    semesters: totals.semesters + 1,
    manifestsPresent: totals.manifestsPresent + (semester.manifestStatus === 'present' ? 1 : 0),
    subjects: totals.subjects + semester.subjects,
    subjectsWithUnits: totals.subjectsWithUnits + semester.subjectsWithUnits,
    subjectsWithOutcomes: totals.subjectsWithOutcomes + semester.subjectsWithOutcomes,
    units: totals.units + semester.units,
    topics: totals.topics + semester.topics,
    lessons: totals.lessons + semester.lessons,
    lessonsWithPrimaryVideo: totals.lessonsWithPrimaryVideo + semester.lessonsWithPrimaryVideo,
    lessonsWithApprovedPdf: totals.lessonsWithApprovedPdf + semester.lessonsWithApprovedPdf,
    lessonsWithPractice: totals.lessonsWithPractice + semester.lessonsWithPractice,
    brokenResources: totals.brokenResources + semester.brokenResources,
    pendingVerification: totals.pendingVerification + semester.pendingVerification,
    youtubeCandidates: totals.youtubeCandidates + semester.youtubeCandidates,
    youtubeMetadataFound: totals.youtubeMetadataFound + semester.youtubeMetadataFound,
    youtubePlaylistsRequireReview: totals.youtubePlaylistsRequireReview + semester.youtubePlaylistsRequireReview,
    youtubeReviewQueueCandidates: totals.youtubeReviewQueueCandidates,
    youtubeReviewQueueSubjectMappings: totals.youtubeReviewQueueSubjectMappings,
    youtubeReviewQueueReadyForLessonMapping: totals.youtubeReviewQueueReadyForLessonMapping,
    youtubeReviewQueueBlockedMissingManifestSubject: totals.youtubeReviewQueueBlockedMissingManifestSubject,
    youtubeReviewQueueBlockedUnplacedOfficialSubject: totals.youtubeReviewQueueBlockedUnplacedOfficialSubject,
    youtubeReviewQueueBlockedMissingLessonStructure: totals.youtubeReviewQueueBlockedMissingLessonStructure,
    linkHealthChecked: totals.linkHealthChecked + semester.linkHealthChecked,
    linkHealthHealthy: totals.linkHealthHealthy + semester.linkHealthHealthy,
    linkHealthUnknown: totals.linkHealthUnknown + semester.linkHealthUnknown,
    officialTimetableEvidenceAppearances: totals.officialTimetableEvidenceAppearances,
    officialTimetableEvidenceCodes: totals.officialTimetableEvidenceCodes,
    officialTimetableEvidencePublicationReady: totals.officialTimetableEvidencePublicationReady,
    officialCourseCatalogCourses: totals.officialCourseCatalogCourses,
    officialCourseCatalogManifestSubjectCodes: totals.officialCourseCatalogManifestSubjectCodes,
    officialCourseCatalogUnplacedCourses: totals.officialCourseCatalogUnplacedCourses,
    officialCourseCatalogCompUnplaced: totals.officialCourseCatalogCompUnplaced,
    officialCourseCatalogCiotUnplaced: totals.officialCourseCatalogCiotUnplaced,
    officialUnitReviewSubjects: totals.officialUnitReviewSubjects,
    officialUnitReviewSubjectsWithCandidates: totals.officialUnitReviewSubjectsWithCandidates,
    officialUnitReviewReadyForPromotion: totals.officialUnitReviewReadyForPromotion,
    officialUnitReviewNeedsManualReview: totals.officialUnitReviewNeedsManualReview,
    officialUnitReviewBlocked: totals.officialUnitReviewBlocked,
  }
}

function emptyTotals(): CoverageTotals {
  return {
    programmes: TARGET_PROGRAMMES.length,
    semesters: 0,
    manifestsPresent: 0,
    subjects: 0,
    subjectsWithUnits: 0,
    subjectsWithOutcomes: 0,
    units: 0,
    topics: 0,
    lessons: 0,
    lessonsWithPrimaryVideo: 0,
    lessonsWithApprovedPdf: 0,
    lessonsWithPractice: 0,
    brokenResources: 0,
    pendingVerification: 0,
    youtubeCandidates: 0,
    youtubeMetadataFound: 0,
    youtubePlaylistsRequireReview: 0,
    youtubeReviewQueueCandidates: 0,
    youtubeReviewQueueSubjectMappings: 0,
    youtubeReviewQueueReadyForLessonMapping: 0,
    youtubeReviewQueueBlockedMissingManifestSubject: 0,
    youtubeReviewQueueBlockedUnplacedOfficialSubject: 0,
    youtubeReviewQueueBlockedMissingLessonStructure: 0,
    linkHealthChecked: 0,
    linkHealthHealthy: 0,
    linkHealthUnknown: 0,
    officialTimetableEvidenceAppearances: 0,
    officialTimetableEvidenceCodes: 0,
    officialTimetableEvidencePublicationReady: 0,
    officialCourseCatalogCourses: 0,
    officialCourseCatalogManifestSubjectCodes: 0,
    officialCourseCatalogUnplacedCourses: 0,
    officialCourseCatalogCompUnplaced: 0,
    officialCourseCatalogCiotUnplaced: 0,
    officialUnitReviewSubjects: 0,
    officialUnitReviewSubjectsWithCandidates: 0,
    officialUnitReviewReadyForPromotion: 0,
    officialUnitReviewNeedsManualReview: 0,
    officialUnitReviewBlocked: 0,
  }
}

function countSubjectUnits(subject: RawSubject): number {
  return arrayValue(subject.units).length
}

function countSubjectTopics(subject: RawSubject): number {
  return arrayValue(subject.units)
    .filter(isRecord)
    .reduce((total, unit) => total + arrayValue((unit as RawUnit).topics).length, 0)
}

function countSubjectLessons(subject: RawSubject): number {
  return arrayValue(subject.units)
    .filter(isRecord)
    .reduce((total, unit) => {
      const current = unit as RawUnit
      const directLessons = arrayValue(current.lessons).length
      const topicLessons = arrayValue(current.topics)
        .filter(isRecord)
        .reduce((topicTotal, topic) => topicTotal + arrayValue((topic as RawTopic).lessons).length, 0)
      return total + directLessons + topicLessons
    }, 0)
}

function candidatesFromMetadata(raw: unknown): RawYouTubeCandidate[] {
  if (!isRecord(raw)) return []
  return arrayValue((raw as RawYouTubeMetadata).candidates).filter(isRecord) as RawYouTubeCandidate[]
}

function resourcesFromLinkHealthReport(raw: unknown): RawLinkHealthResource[] {
  if (!isRecord(raw)) return []
  return arrayValue((raw as RawLinkHealthReport).resources).filter(isRecord) as RawLinkHealthResource[]
}

function reviewQueueTotals(raw: unknown): Pick<
  CoverageTotals,
  | 'youtubeReviewQueueCandidates'
  | 'youtubeReviewQueueSubjectMappings'
  | 'youtubeReviewQueueReadyForLessonMapping'
  | 'youtubeReviewQueueBlockedMissingManifestSubject'
  | 'youtubeReviewQueueBlockedUnplacedOfficialSubject'
  | 'youtubeReviewQueueBlockedMissingLessonStructure'
> {
  const totals = isRecord(raw) && isRecord((raw as RawYouTubeReviewQueue).totals)
    ? (raw as RawYouTubeReviewQueue).totals as Record<string, unknown>
    : {}
  return {
    youtubeReviewQueueCandidates: positiveInteger(totals.candidates),
    youtubeReviewQueueSubjectMappings: positiveInteger(totals.subjectMappings),
    youtubeReviewQueueReadyForLessonMapping: positiveInteger(totals.readyForLessonMappingReview),
    youtubeReviewQueueBlockedMissingManifestSubject: positiveInteger(totals.blockedMissingManifestSubject),
    youtubeReviewQueueBlockedUnplacedOfficialSubject: positiveInteger(totals.blockedUnplacedOfficialSubject),
    youtubeReviewQueueBlockedMissingLessonStructure: positiveInteger(totals.blockedMissingLessonStructure),
  }
}

function timetableEvidenceTotals(raw: unknown): Pick<
  CoverageTotals,
  | 'officialTimetableEvidenceAppearances'
  | 'officialTimetableEvidenceCodes'
  | 'officialTimetableEvidencePublicationReady'
> {
  const totals = isRecord(raw) && isRecord((raw as RawOfficialTimetableEvidence).totals)
    ? (raw as RawOfficialTimetableEvidence).totals as Record<string, unknown>
    : {}
  return {
    officialTimetableEvidenceAppearances: positiveInteger(totals.appearances),
    officialTimetableEvidenceCodes: positiveInteger(totals.uniqueCodes),
    officialTimetableEvidencePublicationReady: positiveInteger(totals.publicationReadySemesterManifests),
  }
}

function courseCatalogTotals(raw: unknown): Pick<
  CoverageTotals,
  | 'officialCourseCatalogCourses'
  | 'officialCourseCatalogManifestSubjectCodes'
  | 'officialCourseCatalogUnplacedCourses'
  | 'officialCourseCatalogCompUnplaced'
  | 'officialCourseCatalogCiotUnplaced'
> {
  const totals = isRecord(raw) && isRecord((raw as RawOfficialCourseCatalog).totals)
    ? (raw as RawOfficialCourseCatalog).totals as Record<string, unknown>
    : {}
  return {
    officialCourseCatalogCourses: positiveInteger(totals.officialCourses),
    officialCourseCatalogManifestSubjectCodes: positiveInteger(totals.manifestSubjectCodes),
    officialCourseCatalogUnplacedCourses: positiveInteger(totals.unplacedOfficialCourses),
    officialCourseCatalogCompUnplaced: positiveInteger(totals.compUnplacedOfficialCourses),
    officialCourseCatalogCiotUnplaced: positiveInteger(totals.ciotUnplacedOfficialCourses),
  }
}

function unitReviewTotals(raw: unknown): Pick<
  CoverageTotals,
  | 'officialUnitReviewSubjects'
  | 'officialUnitReviewSubjectsWithCandidates'
  | 'officialUnitReviewReadyForPromotion'
  | 'officialUnitReviewNeedsManualReview'
  | 'officialUnitReviewBlocked'
> {
  const totals = isRecord(raw) && isRecord((raw as RawOfficialUnitReviewQueue).totals)
    ? (raw as RawOfficialUnitReviewQueue).totals as Record<string, unknown>
    : {}
  return {
    officialUnitReviewSubjects: positiveInteger(totals.subjects),
    officialUnitReviewSubjectsWithCandidates: positiveInteger(totals.subjectsWithUnitCandidates),
    officialUnitReviewReadyForPromotion: positiveInteger(totals.readyForUnitPromotionReview),
    officialUnitReviewNeedsManualReview: positiveInteger(totals.needsManualUnitReview),
    officialUnitReviewBlocked:
      positiveInteger(totals.blockedMissingCourseBlock) + positiveInteger(totals.blockedNoUnitCandidates),
  }
}

function metadataFor(candidate: RawYouTubeCandidate): Record<string, unknown> {
  return isRecord(candidate.metadata) ? candidate.metadata : {}
}

function arrayValue(value: unknown): unknown[] {
  return Array.isArray(value) ? value : []
}

function stringValue(value: unknown): string | null {
  return typeof value === 'string' && value.trim() ? value.trim() : null
}

function numberValue(value: unknown): number | null {
  return Number.isInteger(value) ? Number(value) : null
}

function positiveInteger(value: unknown): number {
  return Number.isInteger(value) && Number(value) > 0 ? Number(value) : 0
}

function sum(values: number[]): number {
  return values.reduce((total, value) => total + value, 0)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}
