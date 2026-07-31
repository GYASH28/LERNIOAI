import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
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

export const dynamic = 'force-dynamic'

export default async function ContinueLearningPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/learn/current')

  const [profile, recentLesson] = await Promise.all([
    db.user.findUnique({
      where: { id: user.id },
      select: { departmentCode: true, semesterNumber: true },
    }).catch(() => null),
    db.recentlyViewed.findFirst({
      where: { userId: user.id, resourceType: 'lesson' },
      orderBy: { viewedAt: 'desc' },
      select: { href: true, scrollPos: true },
    }).catch(() => null),
  ])

  const validatedRecentHref = recentLesson?.href
    ? resolveExistingLessonHref(recentLesson.href)
    : null

  if (validatedRecentHref) {
    const resumePosition = Math.max(0, Math.round(recentLesson?.scrollPos || 0))
    redirect(
      resumePosition > 0
        ? `${validatedRecentHref}?resume=${resumePosition}`
        : validatedRecentHref,
    )
  }

  const programme = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semester = normalizeSemester(profile?.semesterNumber)
  const fallback = firstExistingLessonHref(programme, semester)

  if (fallback) redirect(fallback)
  redirect(`/learn/${programme}/semester/${semester}`)
}

function resolveExistingLessonHref(value: string) {
  const match = value.match(
    /^\/learn\/([^/]+)\/semester\/([1-6])\/subject\/([^/]+)\/lesson\/([^/?#]+)$/,
  )
  if (!match) return null

  const programme = normalizeProgramme(match[1])
  const semester = normalizeSemester(Number(match[2]))
  const requestedSubjectCode = decodeURIComponent(match[3])
  const requestedLessonSlug = decodeURIComponent(match[4])
  if (!programme) return null

  const subject = getManifestSubject(programme, semester, requestedSubjectCode)
  if (!subject) return null

  return canonicalLessonHref(
    programme,
    semester,
    subject,
    requestedLessonSlug,
  )
}

function firstExistingLessonHref(programme: 'DCOMP' | 'DCIOT', semester: number) {
  for (const subject of getManifestSubjectsForSemester(programme, semester)) {
    const routeCode = routeSubjectCode(programme, subject)
    const notes = getSubjectNotes(routeCode) ?? getSubjectNotes(subject.code)
    const firstDetailedLesson = notes?.units.flatMap((unit) => unit.lessons)[0]
    if (firstDetailedLesson) {
      return lessonHref(programme, semester, routeCode, firstDetailedLesson.slug)
    }

    const firstManifestLesson = enhanceSubject(subject).units
      .flatMap((unit) => unit.lessons)[0]
    if (firstManifestLesson) {
      return lessonHref(programme, semester, routeCode, firstManifestLesson.slug)
    }
  }

  return null
}

function canonicalLessonHref(
  programme: 'DCOMP' | 'DCIOT',
  semester: number,
  subject: ManifestSubject,
  requestedSlug: string,
) {
  const routeCode = routeSubjectCode(programme, subject)
  const noteCodes = [routeCode, subject.code, subject.alternateCode]
    .filter((value): value is string => Boolean(value))

  for (const code of noteCodes) {
    const detailed = findLessonBySlug(code, requestedSlug)
    if (detailed) {
      return lessonHref(programme, semester, routeCode, detailed.lesson.slug)
    }
  }

  const normalizedRequested = normalizeLessonSlug(requestedSlug)
  const manifestLesson = enhanceSubject(subject).units
    .flatMap((unit) => unit.lessons)
    .find((lesson) => normalizeLessonSlug(lesson.slug) === normalizedRequested)

  return manifestLesson
    ? lessonHref(programme, semester, routeCode, manifestLesson.slug)
    : null
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
