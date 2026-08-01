import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getLessonStudio } from '@/features/learning/server/get-lesson-studio'
import { getManifestSubject } from '@/lib/curriculum/manifest-data'
import { resolveMaterialsLesson } from '@/lib/curriculum/materials-catalog'
import { DbLessonStudio } from '@/components/learning/db-lesson-studio'
import { ManifestLessonStudio } from '@/components/learning/manifest-lesson-studio'
import { RecentLearningBeacon } from '@/components/learning/recent-learning-beacon'

export const dynamic = 'force-dynamic'

export default async function LessonStudioPage({
  params,
}: {
  params: Promise<{
    programmeCode: string
    semesterNumber: string
    subjectCode: string
    lessonSlug: string
  }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode, lessonSlug } = await params
  const callbackUrl = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson/${lessonSlug}`
  if (!authUser) redirect(`/sign-in?callbackUrl=${encodeURIComponent(callbackUrl)}`)

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester) || semester < 1 || semester > 6) notFound()

  const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
  const notesSubjectCode =
    programmeCode === 'DCIOT' && manifestSubject?.alternateCode
      ? manifestSubject.alternateCode
      : subjectCode

  const recentBeacon = (
    <RecentLearningBeacon
      href={callbackUrl}
      resourceId={`${programmeCode}:${semester}:${subjectCode}:${lessonSlug}`}
      fallbackTitle={titleFromSlug(lessonSlug)}
    />
  )

  const studio = await getLessonStudio(authUser.id, {
    programmeCode,
    semesterNumber: semester,
    subjectCode,
    lessonSlug,
  }).catch((error) => {
    console.error('[lesson-studio:data-fallback]', {
      programmeCode,
      semester,
      subjectCode,
      lessonSlug,
      message: error instanceof Error ? error.message : String(error),
    })
    return null
  })

  if (studio?.needsCanonicalRedirect) redirect(studio.canonicalPath)

  /**
   * The generated curriculum notes are the stable public source of truth for
   * lesson rendering. DB lessons can use id-based routes and partially seeded
   * mode data; resolving their title back to the curriculum prevents one
   * incomplete DB record from crashing the whole student lesson page.
   */
  const stableLesson = manifestSubject
    ? resolveMaterialsLesson(notesSubjectCode, studio?.lesson.title ?? lessonSlug)
      ?? resolveMaterialsLesson(subjectCode, studio?.lesson.title ?? lessonSlug)
    : null

  if (manifestSubject && stableLesson) {
    return (
      <>
        {recentBeacon}
        <ManifestLessonStudio
          programmeCode={programmeCode}
          semesterNumber={semester}
          subjectCode={subjectCode}
          lessonSlug={stableLesson.lesson.slug}
          subject={manifestSubject}
        />
      </>
    )
  }

  if (studio) {
    return (
      <>
        {recentBeacon}
        <DbLessonStudio studio={studio} lessonSlug={lessonSlug} />
      </>
    )
  }

  if (!manifestSubject) notFound()

  return (
    <>
      {recentBeacon}
      <ManifestLessonStudio
        programmeCode={programmeCode}
        semesterNumber={semester}
        subjectCode={subjectCode}
        lessonSlug={lessonSlug}
        subject={manifestSubject}
      />
    </>
  )
}

function titleFromSlug(value: string) {
  return value
    .replace(/--[a-z0-9_-]{8,}$/i, '')
    .split('-')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}
