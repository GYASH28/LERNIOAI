import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getLessonStudio } from '@/features/learning/server/get-lesson-studio'
import { getManifestSubject } from '@/lib/curriculum/manifest-data'
import { DbLessonStudio } from '@/components/learning/db-lesson-studio'
import { ManifestLessonStudio } from '@/components/learning/manifest-lesson-studio'

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

  const studio = await getLessonStudio(authUser.id, {
    programmeCode,
    semesterNumber: semester,
    subjectCode,
    lessonSlug,
  }).catch(() => null)

  if (studio) {
    if (studio.needsCanonicalRedirect) redirect(studio.canonicalPath)
    return <DbLessonStudio studio={studio} lessonSlug={lessonSlug} />
  }

  const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!manifestSubject) notFound()

  return (
    <ManifestLessonStudio
      programmeCode={programmeCode}
      semesterNumber={semester}
      subjectCode={subjectCode}
      lessonSlug={lessonSlug}
      subject={manifestSubject}
    />
  )
}
