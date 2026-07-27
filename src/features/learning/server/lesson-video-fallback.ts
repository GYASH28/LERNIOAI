export interface LessonVideoCandidate {
  lessonResourceId: string
  role: string
  embedUrl: string | null
  linkHealth: string
  isPrimary: boolean
  sortOrder?: number | null
  coveragePercentage?: number | null
  qualityScore?: number | null
  curricularReviewStatus?: string | null
}

export interface LessonVideoSelection<T extends LessonVideoCandidate> {
  primaryVideo: T | null
  alternateVideos: T[]
  fallbackReason: string | null
  /** True when no video has been curricularly reviewed yet */
  pendingCurricularReview: boolean
}

const VIDEO_RESOURCE_ROLES = new Set(['primary_video', 'alternate_video'])
const PLAYABLE_HEALTH = new Set(['healthy', 'redirected', 'unknown'])
const BAD_HEALTH = new Set(['stale', 'unhealthy'])

/**
 * Curricular review statuses that allow a video to be shown to students.
 * Only `correct` means a human reviewer confirmed this video teaches the
 * right topic at the right level for this specific lesson.
 *
 * `unreviewed` videos are NEVER shown to students — only to admins/reviewers.
 * `wrong_topic`, `wrong_level`, `wrong_language`, `low_quality` are explicitly
 * rejected.
 */
const CURRICULARLY_CORRECT = new Set(['correct'])

/**
 * Select the best video resource for a lesson, applying BOTH technical
 * verification (link health + embed URL) AND curricular review (the
 * `curricularReviewStatus` field must be `correct`).
 *
 * Videos that haven't been curricularly reviewed (`unreviewed`) are
 * excluded from student-facing selection. If no video passes both gates,
 * `primaryVideo` is null and `pendingCurricularReview` is true.
 */
export function selectLessonVideoResource<T extends LessonVideoCandidate>(
  resources: T[],
): LessonVideoSelection<T> {
  const videos = resources.filter((resource) => VIDEO_RESOURCE_ROLES.has(resource.role))
  const configuredPrimary =
    videos.find((resource) => resource.role === 'primary_video' && resource.isPrimary) ??
    videos.find((resource) => resource.role === 'primary_video') ??
    null

  // Gate 1: Curricular review — only show videos marked 'correct'
  const curricularlyApproved = videos.filter(hasCurricularApproval)

  // Gate 2: Technical playability — embed URL exists + link health is playable
  const playableVideos = curricularlyApproved
    .filter(isPlayableVideo)
    .sort((a, b) => videoRank(b, configuredPrimary) - videoRank(a, configuredPrimary))

  const selected = playableVideos[0] ?? null

  // pendingCurricularReview is true only when:
  // 1. No video passed both gates (selected is null), AND
  // 2. There are unreviewed videos that could potentially pass once reviewed
  const anyUnreviewed = videos.some((v) => (v.curricularReviewStatus ?? 'unreviewed').trim().toLowerCase() === 'unreviewed')
  const pendingCurricularReview = selected === null && anyUnreviewed

  const fallbackReason = selected && configuredPrimary && selected.lessonResourceId !== configuredPrimary.lessonResourceId
    ? fallbackReasonForPrimary(configuredPrimary)
    : selected && !configuredPrimary && selected.role === 'alternate_video'
      ? 'Showing an approved alternate lecture because no primary video is configured.'
      : null

  return {
    primaryVideo: selected,
    alternateVideos: curricularlyApproved.filter((resource) => resource.lessonResourceId !== selected?.lessonResourceId),
    fallbackReason,
    pendingCurricularReview,
  }
}

/**
 * Returns true if the resource has been curricularly reviewed and approved.
 * A video with no `curricularReviewStatus` field (old data) is treated as
 * `unreviewed` — it will NOT be shown to students until a reviewer marks it.
 */
function hasCurricularApproval(resource: LessonVideoCandidate): boolean {
  const status = (resource.curricularReviewStatus ?? 'unreviewed').trim().toLowerCase()
  return CURRICULARLY_CORRECT.has(status)
}

function isPlayableVideo(resource: LessonVideoCandidate): boolean {
  return Boolean(resource.embedUrl) && PLAYABLE_HEALTH.has(normalizeHealth(resource.linkHealth))
}

function videoRank(resource: LessonVideoCandidate, configuredPrimary: LessonVideoCandidate | null): number {
  const health = normalizeHealth(resource.linkHealth)
  const primaryMatch = configuredPrimary?.lessonResourceId === resource.lessonResourceId
  const coverage = resource.coveragePercentage ?? 0
  const quality = resource.qualityScore ?? 0

  return (
    (primaryMatch ? 10_000 : 0) +
    (resource.isPrimary ? 1_000 : 0) +
    (resource.role === 'primary_video' ? 500 : 0) +
    healthRank(health) +
    coverage +
    quality +
    sortOrderRank(resource.sortOrder)
  )
}

function healthRank(health: string): number {
  if (health === 'healthy') return 400
  if (health === 'redirected') return 300
  if (health === 'unknown') return 100
  if (health === 'stale') return -400
  if (health === 'unhealthy') return -500
  return 0
}

function sortOrderRank(sortOrder: number | null | undefined): number {
  return Math.max(0, 100 - Math.max(0, sortOrder ?? 0))
}

function fallbackReasonForPrimary(primary: LessonVideoCandidate): string {
  if (!primary.embedUrl) return 'Showing an approved alternate lecture because the primary video is not embeddable.'
  const health = normalizeHealth(primary.linkHealth)
  if (BAD_HEALTH.has(health)) {
    return `Showing an approved alternate lecture because the primary video link is marked ${health}.`
  }
  if (!hasCurricularApproval(primary)) {
    return 'Showing a curricularly-reviewed alternate lecture because the primary video has not been reviewed for this lesson yet.'
  }
  return 'Showing an approved alternate lecture because it is the healthiest available lecture.'
}

function normalizeHealth(value: string): string {
  return value.trim().toLowerCase()
}
