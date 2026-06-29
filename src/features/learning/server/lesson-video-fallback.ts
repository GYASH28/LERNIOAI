export interface LessonVideoCandidate {
  lessonResourceId: string
  role: string
  embedUrl: string | null
  linkHealth: string
  isPrimary: boolean
  sortOrder?: number | null
  coveragePercentage?: number | null
  qualityScore?: number | null
}

export interface LessonVideoSelection<T extends LessonVideoCandidate> {
  primaryVideo: T | null
  alternateVideos: T[]
  fallbackReason: string | null
}

const VIDEO_RESOURCE_ROLES = new Set(['primary_video', 'alternate_video'])
const PLAYABLE_HEALTH = new Set(['healthy', 'redirected', 'unknown'])
const BAD_HEALTH = new Set(['stale', 'unhealthy'])

export function selectLessonVideoResource<T extends LessonVideoCandidate>(
  resources: T[],
): LessonVideoSelection<T> {
  const videos = resources.filter((resource) => VIDEO_RESOURCE_ROLES.has(resource.role))
  const configuredPrimary =
    videos.find((resource) => resource.role === 'primary_video' && resource.isPrimary) ??
    videos.find((resource) => resource.role === 'primary_video') ??
    null

  const playableVideos = videos
    .filter(isPlayableVideo)
    .sort((a, b) => videoRank(b, configuredPrimary) - videoRank(a, configuredPrimary))

  const selected = playableVideos[0] ?? configuredPrimary ?? null
  const fallbackReason = selected && configuredPrimary && selected.lessonResourceId !== configuredPrimary.lessonResourceId
    ? fallbackReasonForPrimary(configuredPrimary)
    : selected && !configuredPrimary && selected.role === 'alternate_video'
      ? 'Showing an approved alternate lecture because no primary video is configured.'
      : null

  return {
    primaryVideo: selected,
    alternateVideos: videos.filter((resource) => resource.lessonResourceId !== selected?.lessonResourceId),
    fallbackReason,
  }
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
  return 'Showing an approved alternate lecture because it is the healthiest available lecture.'
}

function normalizeHealth(value: string): string {
  return value.trim().toLowerCase()
}
