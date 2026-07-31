import type { Lesson } from '@/lib/curriculum/lesson-notes-loader'
import { getReviewedLessonVideoMappings } from '@/lib/curriculum/lesson-video-catalog'
import {
  buildYouTubeThumbnailUrl,
  extractYouTubePlaylistId,
  extractYouTubeVideoId,
  type ManifestResource,
  type ManifestSubject,
} from '@/lib/curriculum/manifest-data'

export interface LessonVideoSelection {
  lessonSlug: string
  resource: ManifestResource
  videoId: string
  url: string
  embedUrl: string
  thumbnailUrl: string
  score: number
  mappingReason: 'title_match' | 'concept_match' | 'ordered_subject_fallback'
}

const STOP_WORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from', 'in', 'into',
  'is', 'it', 'of', 'on', 'or', 'the', 'to', 'using', 'with', 'introduction',
  'overview', 'basics', 'basic', 'concept', 'concepts', 'lecture', 'tutorial',
])

function tokens(value: string) {
  return new Set(
    value
      .toLowerCase()
      .replace(/[^a-z0-9+#]+/g, ' ')
      .split(/\s+/)
      .filter((token) => token.length > 1 && !STOP_WORDS.has(token)),
  )
}

function overlapScore(left: Set<string>, right: Set<string>) {
  let score = 0
  for (const token of left) {
    if (right.has(token)) score += token.length >= 6 ? 3 : 2
  }
  return score
}

function directVideoResources(subject: ManifestSubject) {
  return subject.resources
    .map((resource) => ({ resource, videoId: resource.videoId || extractYouTubeVideoId(resource.url) }))
    .filter((entry): entry is { resource: ManifestResource; videoId: string } =>
      Boolean(entry.videoId) && !extractYouTubePlaylistId(entry.resource.url),
    )
}

function scoreCandidate(subject: ManifestSubject, lesson: Lesson, resource: ManifestResource) {
  const lessonTitleTokens = tokens(lesson.title)
  const lessonContextTokens = tokens([
    lesson.overview,
    ...(lesson.objectives ?? []),
    ...lesson.keyConcepts,
    ...(lesson.prerequisites ?? []),
  ].join(' '))
  const resourceTitleTokens = tokens(resource.title)
  const resourceContextTokens = tokens(`${resource.description} ${subject.coverageFocus}`)

  const title = overlapScore(lessonTitleTokens, resourceTitleTokens)
  const concepts = overlapScore(lessonContextTokens, new Set([...resourceTitleTokens, ...resourceContextTokens]))
  const role = resource.role === 'primary_video' ? 2 : 0
  return { total: title * 3 + concepts + role, title, concepts }
}

/**
 * Produces a one-to-one lesson→video assignment for a subject.
 *
 * Guarantees:
 * - a playlist URL is never returned as the lesson player;
 * - reviewed playlist-expanded mappings take priority;
 * - a direct video is never repeated across two lessons;
 * - unmatched lessons remain honestly video-less instead of receiving a
 *   duplicated subject player.
 */
export function buildManifestLessonVideoAssignments(
  subject: ManifestSubject,
  lessons: Lesson[],
): Map<string, LessonVideoSelection> {
  const assignments = new Map<string, LessonVideoSelection>()
  if (lessons.length === 0) return assignments

  const lessonBySlug = new Map(lessons.map((lesson) => [lesson.slug, lesson]))
  const usedVideoIds = new Set<string>()
  const reviewedMappings = getReviewedLessonVideoMappings(
    [subject.code, subject.alternateCode ?? ''].filter(Boolean),
  )

  for (const mapping of reviewedMappings) {
    const lesson = lessonBySlug.get(mapping.lessonSlug)
    if (!lesson || usedVideoIds.has(mapping.videoId) || assignments.has(lesson.slug)) continue
    const resource: ManifestResource = {
      title: mapping.title,
      channel: mapping.channel,
      language: mapping.language,
      role: 'primary_video',
      url: `https://www.youtube.com/watch?v=${mapping.videoId}`,
      playlistId: null,
      videoId: mapping.videoId,
      description: mapping.description,
      sourcePdf: mapping.sourcePdf,
      sourcePage: mapping.sourcePage,
    }
    assignments.set(lesson.slug, toSelection(
      lesson,
      resource,
      mapping.videoId,
      mapping.confidence * 100,
      'title_match',
    ))
    usedVideoIds.add(mapping.videoId)
  }

  const directVideos = directVideoResources(subject).filter((candidate) => !usedVideoIds.has(candidate.videoId))
  const remainingLessons = lessons.filter((lesson) => !assignments.has(lesson.slug))
  if (directVideos.length === 0 || remainingLessons.length === 0) return assignments

  const pairs = remainingLessons.flatMap((lesson, lessonIndex) =>
    directVideos.map((candidate, resourceIndex) => {
      const score = scoreCandidate(subject, lesson, candidate.resource)
      return { lesson, lessonIndex, candidate, resourceIndex, ...score }
    }),
  )

  pairs.sort((a, b) =>
    b.total - a.total ||
    b.title - a.title ||
    b.concepts - a.concepts ||
    a.lessonIndex - b.lessonIndex ||
    a.resourceIndex - b.resourceIndex,
  )

  for (const pair of pairs) {
    if (pair.total < 4) continue
    if (assignments.has(pair.lesson.slug) || usedVideoIds.has(pair.candidate.videoId)) continue
    assignments.set(pair.lesson.slug, toSelection(
      pair.lesson,
      pair.candidate.resource,
      pair.candidate.videoId,
      pair.total,
      pair.title > 0 ? 'title_match' : 'concept_match',
    ))
    usedVideoIds.add(pair.candidate.videoId)
  }

  const stillUnassigned = lessons.filter((lesson) => !assignments.has(lesson.slug))
  const unusedVideos = directVideos.filter((candidate) => !usedVideoIds.has(candidate.videoId))
  const fallbackCount = Math.min(stillUnassigned.length, unusedVideos.length)

  for (let index = 0; index < fallbackCount; index += 1) {
    const lesson = stillUnassigned[index]
    const candidate = unusedVideos[index]
    assignments.set(lesson.slug, toSelection(
      lesson,
      candidate.resource,
      candidate.videoId,
      0,
      'ordered_subject_fallback',
    ))
    usedVideoIds.add(candidate.videoId)
  }

  return assignments
}

export function resolveManifestLessonVideo(subject: ManifestSubject, lessons: Lesson[], lessonSlug: string) {
  return buildManifestLessonVideoAssignments(subject, lessons).get(lessonSlug) ?? null
}

function toSelection(
  lesson: Lesson,
  resource: ManifestResource,
  videoId: string,
  score: number,
  mappingReason: LessonVideoSelection['mappingReason'],
): LessonVideoSelection {
  const url = `https://www.youtube.com/watch?v=${videoId}`
  return {
    lessonSlug: lesson.slug,
    resource,
    videoId,
    url,
    embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0`,
    thumbnailUrl: buildYouTubeThumbnailUrl(url) || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    score,
    mappingReason,
  }
}
