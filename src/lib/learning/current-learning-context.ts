import 'server-only'

import { db } from '@/lib/db'
import {
  getManifestSubject,
  getManifestSubjectsForSemester,
  type ManifestSubject,
} from '@/lib/curriculum/manifest-data'
import { enhanceSubject } from '@/lib/curriculum/enhanced-manifest'
import {
  findLessonBySlug,
  getSubjectNotes,
  normalizeLessonSlug,
} from '@/lib/curriculum/lesson-notes-loader'

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

  const recent = recentLesson?.href
    ? resolveExistingLesson(recentLesson.href)
    : null

  if (recent) {
    const scrollPos = normalizeScrollPosition(recentLesson?.scrollPos)
    return {
      ...recent,
      lessonTitle: recent.lessonTitle || recentLesson?.title || 'Continue lesson',
      scrollPos,
      resumeHref: addResumePosition(recent.href, scrollPos),
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

  return canonicalLesson(
    programme,
    semester,
    subject,
    requestedLessonSlug,
  )
}

export function firstExistingLesson(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
): CanonicalLesson | null {
  for (const subject of getManifestSubjectsForSemester(programme, semester)) {
    const routeCode = routeSubjectCode(programme, subject)
    const notes = getSubjectNotes(routeCode) ?? getSubjectNotes(subject.code)
    const firstDetailedLesson = notes?.units.flatMap((unit) => unit.lessons)[0]
    if (firstDetailedLesson) {
      return {
        programme,
        semester,
        subjectCode: routeCode,
        subjectName: subject.name,
        lessonSlug: firstDetailedLesson.slug,
        lessonTitle: firstDetailedLesson.title,
        href: lessonHref(programme, semester, routeCode, firstDetailedLesson.slug),
      }
    }

    const firstManifestLesson = enhanceSubject(subject).units
      .flatMap((unit) => unit.lessons)[0]
    if (firstManifestLesson) {
      return {
        programme,
        semester,
        subjectCode: routeCode,
        subjectName: subject.name,
        lessonSlug: firstManifestLesson.slug,
        lessonTitle: firstManifestLesson.title,
        href: lessonHref(programme, semester, routeCode, firstManifestLesson.slug),
      }
    }
  }

  return null
}

function canonicalLesson(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
  subject: ManifestSubject,
  requestedSlug: string,
): CanonicalLesson | null {
  const routeCode = routeSubjectCode(programme, subject)
  const noteCodes = [routeCode, subject.code, subject.alternateCode]
    .filter((value): value is string => Boolean(value))

  for (const code of noteCodes) {
    const detailed = findLessonBySlug(code, requestedSlug)
    if (detailed) {
      return {
        programme,
        semester,
        subjectCode: routeCode,
        subjectName: subject.name,
        lessonSlug: detailed.lesson.slug,
        lessonTitle: detailed.lesson.title,
        href: lessonHref(programme, semester, routeCode, detailed.lesson.slug),
      }
    }
  }

  const normalizedRequested = normalizeLessonSlug(requestedSlug)
  const manifestLesson = enhanceSubject(subject).units
    .flatMap((unit) => unit.lessons)
    .find((lesson) => normalizeLessonSlug(lesson.slug) === normalizedRequested)

  if (!manifestLesson) return null
  return {
    programme,
    semester,
    subjectCode: routeCode,
    subjectName: subject.name,
    lessonSlug: manifestLesson.slug,
    lessonTitle: manifestLesson.title,
    href: lessonHref(programme, semester, routeCode, manifestLesson.slug),
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

function addResumePosition(href: string, scrollPos: number) {
  return scrollPos > 0 ? `${href}?resume=${scrollPos}` : href
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

function normalizeScrollPosition(value: number | null | undefined) {
  if (!Number.isFinite(value) || Number(value) <= 0) return 0
  return Math.min(10_000_000, Math.round(Number(value)))
}

function safePathname(value: string) {
  try {
    return value.startsWith('/') ? new URL(value, 'https://lernio.local').pathname : new URL(value).pathname
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
