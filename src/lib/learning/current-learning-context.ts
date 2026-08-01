import 'server-only'

import { db } from '@/lib/db'
import {
  getManifestSubject,
  getManifestSubjectsForSemester,
  type ManifestSubject,
} from '@/lib/curriculum/manifest-data'
import { normalizeLessonSlug } from '@/lib/curriculum/lesson-notes-loader'
import { buildVideoLearningCatalog } from '@/lib/curriculum/video-learning-catalog'

export interface CurrentLearningContext {
  programme: 'DCOMP' | 'DCIOT'
  semester: number
  subjectCode: string
  subjectName: string
  lessonSlug: string
  lessonTitle: string
  href: string
  resumeHref: string
  scrollPos: number
  source: 'recent' | 'fallback'
}

interface LearningContextFallback {
  programme: 'DCOMP' | 'DCIOT'
  semester: number
}

interface CanonicalLesson {
  programme: 'DCOMP' | 'DCIOT'
  semester: number
  subjectCode: string
  subjectName: string
  lessonSlug: string
  lessonTitle: string
  href: string
}

/**
 * Resolves the next playable Learn item. Learn lessons are video lessons, so
 * written-only topics are deliberately excluded and remain in Materials.
 */
export async function getCurrentLearningContext(
  userId: string,
  fallback?: LearningContextFallback,
): Promise<CurrentLearningContext | null> {
  const [profile, recentLesson] = await Promise.all([
    fallback
      ? Promise.resolve(null)
      : db.user.findUnique({
          where: { id: userId },
          select: { departmentCode: true, semesterNumber: true },
        }).catch(() => null),
    db.recentlyViewed.findFirst({
      where: { userId, resourceType: 'lesson' },
      orderBy: { viewedAt: 'desc' },
      select: { href: true, title: true, scrollPos: true },
    }).catch(() => null),
  ])

  const programme = fallback?.programme
    ?? (profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP')
  const semester = normalizeSemester(fallback?.semester ?? profile?.semesterNumber)
  const recent = recentLesson?.href ? resolveExistingLesson(recentLesson.href) : null

  if (recent) {
    return {
      ...recent,
      lessonTitle: recent.lessonTitle || recentLesson?.title || 'Continue video lesson',
      scrollPos: 0,
      resumeHref: recent.href,
      source: 'recent',
    }
  }

  const firstLesson = firstExistingLesson(programme, semester)
  if (!firstLesson) return null

  return {
    ...firstLesson,
    scrollPos: 0,
    resumeHref: firstLesson.href,
    source: 'fallback',
  }
}

export function resolveExistingLesson(value: string): CanonicalLesson | null {
  const path = safePathname(value)
  const match = path.match(
    /^\/learn\/([^/]+)\/semester\/([1-6])\/subject\/([^/]+)\/lesson\/([^/?#]+)$/,
  )
  if (!match) return null

  const programme = normalizeProgramme(match[1])
  const semester = normalizeSemester(Number(match[2]))
  const requestedSubjectCode = safeDecode(match[3])
  const requestedLessonSlug = safeDecode(match[4])
  if (!programme || !requestedSubjectCode || !requestedLessonSlug) return null

  const subject = getManifestSubject(programme, semester, requestedSubjectCode)
  if (!subject) return null

  return canonicalVideoLesson(programme, semester, subject, requestedLessonSlug)
}

export function firstExistingLesson(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
): CanonicalLesson | null {
  for (const subject of getManifestSubjectsForSemester(programme, semester)) {
    const catalog = buildVideoLearningCatalog(programme, subject)
    const first = catalog.videoLessons[0]
    if (!first) continue

    const routeCode = routeSubjectCode(programme, subject)
    return {
      programme,
      semester,
      subjectCode: routeCode,
      subjectName: subject.name,
      lessonSlug: first.slug,
      lessonTitle: first.title,
      href: lessonHref(programme, semester, routeCode, first.slug),
    }
  }

  return null
}

function canonicalVideoLesson(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
  subject: ManifestSubject,
  requestedSlug: string,
): CanonicalLesson | null {
  const catalog = buildVideoLearningCatalog(programme, subject)
  const normalizedRequested = normalizeLessonSlug(requestedSlug)
  const lesson = catalog.videoLessons.find((item) =>
    item.slug === requestedSlug || normalizeLessonSlug(item.slug) === normalizedRequested,
  )
  if (!lesson) return null

  const routeCode = routeSubjectCode(programme, subject)
  return {
    programme,
    semester,
    subjectCode: routeCode,
    subjectName: subject.name,
    lessonSlug: lesson.slug,
    lessonTitle: lesson.title,
    href: lessonHref(programme, semester, routeCode, lesson.slug),
  }
}

function routeSubjectCode(programme: 'DCOMP' | 'DCIOT', subject: ManifestSubject) {
  return programme === 'DCIOT' && subject.alternateCode
    ? subject.alternateCode
    : subject.code
}

function lessonHref(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
  subjectCode: string,
  lessonSlug: string,
) {
  return `/learn/${programme}/semester/${semester}/subject/${encodeURIComponent(subjectCode)}/lesson/${encodeURIComponent(lessonSlug)}`
}

function normalizeProgramme(value: string): 'DCOMP' | 'DCIOT' | null {
  const normalized = value.trim().toUpperCase()
  if (normalized === 'DCOMP' || normalized === 'DCIOT') return normalized
  return null
}

function normalizeSemester(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6
    ? Number(value)
    : 3
}

function safePathname(value: string) {
  try {
    return value.startsWith('/')
      ? new URL(value, 'https://lernio.local').pathname
      : new URL(value).pathname
  } catch {
    return ''
  }
}

function safeDecode(value: string) {
  try {
    return decodeURIComponent(value)
  } catch {
    return ''
  }
}
