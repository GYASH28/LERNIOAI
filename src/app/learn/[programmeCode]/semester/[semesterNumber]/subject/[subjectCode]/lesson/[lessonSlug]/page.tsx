import { notFound, redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubject } from '@/lib/curriculum/manifest-data'
import { VideoLessonStudio } from '@/components/learning/video-lesson-studio'
import { RecentLearningBeacon } from '@/components/learning/recent-learning-beacon'

export const dynamic = 'force-dynamic'

export default async function LessonVideoPage({
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

  const subject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!subject) notFound()

  return (
    <>
      <RecentLearningBeacon
        href={callbackUrl}
        resourceId={`${programmeCode}:${semester}:${subjectCode}:${lessonSlug}`}
        fallbackTitle={titleFromSlug(lessonSlug)}
      />
      <VideoLessonStudio
        programmeCode={programmeCode}
        semesterNumber={semester}
        subjectCode={subjectCode}
        lessonSlug={lessonSlug}
        subject={subject}
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
