import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'

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

  if (recentLesson?.href && isSafeLessonHref(recentLesson.href)) {
    const resumePosition = Math.max(0, Math.round(recentLesson.scrollPos || 0))
    redirect(
      resumePosition > 0
        ? `${recentLesson.href}?resume=${resumePosition}`
        : recentLesson.href,
    )
  }

  const programme = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semester = normalizeSemester(profile?.semesterNumber)
  const subjects = getManifestSubjectsForSemester(programme, semester)

  for (const subject of subjects) {
    const code = programme === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
    const notes = getSubjectNotes(code) ?? getSubjectNotes(subject.code)
    const firstLesson = notes?.units.flatMap((unit) => unit.lessons)[0]
    if (firstLesson) {
      redirect(`/learn/${programme}/semester/${semester}/subject/${code}/lesson/${firstLesson.slug}`)
    }
  }

  const firstSubject = subjects[0]
  if (firstSubject) {
    const code = programme === 'DCIOT' && firstSubject.alternateCode
      ? firstSubject.alternateCode
      : firstSubject.code
    redirect(`/learn/${programme}/semester/${semester}/subject/${code}`)
  }

  redirect(`/learn/${programme}/semester/${semester}`)
}

function normalizeSemester(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6
    ? Number(value)
    : 3
}

function isSafeLessonHref(value: string) {
  return /^\/learn\/[A-Za-z0-9_-]+\/semester\/[1-6]\/subject\/[A-Za-z0-9_-]+\/lesson\/[A-Za-z0-9_-]+$/.test(value)
}
