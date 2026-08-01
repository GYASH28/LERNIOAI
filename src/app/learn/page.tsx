import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  LearningOSMobileFirstHome,
  type LearningOSSemesterSummary,
} from '@/components/learning/learning-os-mobile-first-home'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { buildVideoLearningCatalog } from '@/lib/curriculum/video-learning-catalog'
import { getLocalDateStringInKolkata } from '@/lib/timezone'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/learn')

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      departmentCode: true,
      semesterNumber: true,
      dailyMins: true,
      xp: true,
      streak: true,
    },
  }).catch((error) => {
    console.error('[learn:profile-fallback]', error)
    return null
  })

  const programme = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const currentSemester = normalizeSemester(profile?.semesterNumber)
  const today = new Date()
  const weekEnd = new Date(today)
  weekEnd.setDate(weekEnd.getDate() + 7)

  const [revisionDue, plannedLessons] = await Promise.all([
    db.revisionSchedule.count({
      where: { userId: user.id, nextDueDate: { lte: today } },
    }).catch(() => 0),
    db.studyTask.count({
      where: {
        userId: user.id,
        scheduledDate: {
          gte: getLocalDateStringInKolkata(today),
          lte: getLocalDateStringInKolkata(weekEnd),
        },
      },
    }).catch(() => 0),
  ])

  const semesters: LearningOSSemesterSummary[] = [1, 2, 3, 4, 5, 6].map((semesterNumber) => {
    const subjects = getManifestSubjectsForSemester(programme, semesterNumber).flatMap((subject) => {
      try {
        const code = programme === 'DCIOT' && subject.alternateCode
          ? subject.alternateCode
          : subject.code
        const catalog = buildVideoLearningCatalog(programme, subject)
        const firstVideoLesson = catalog.videoLessons[0]

        return [{
          code,
          name: subject.name,
          category: subject.category,
          priority: subject.priority,
          credits: subject.credits,
          coverageFocus: subject.coverageFocus,
          videoLessonCount: catalog.videoLessons.length,
          pendingVideoCount: catalog.pendingTopics.length,
          noteTopicCount: catalog.topics.length,
          notesReady: catalog.notesReady,
          href: `/learn/${programme}/semester/${semesterNumber}/subject/${code}`,
          firstVideoHref: firstVideoLesson
            ? `/learn/${programme}/semester/${semesterNumber}/subject/${code}/lesson/${firstVideoLesson.slug}`
            : null,
        }]
      } catch (error) {
        console.error('[learn:subject-catalog-fallback]', {
          programme,
          semesterNumber,
          subjectCode: subject.code,
          error,
        })
        return []
      }
    })

    return { number: semesterNumber, subjects }
  })

  return (
    <div className="page-wipe mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
      <LearningOSMobileFirstHome
        userName={profile?.name || user.name || 'Learner'}
        programme={programme}
        currentSemester={currentSemester}
        dailyMinutes={normalizeDailyMinutes(profile?.dailyMins)}
        xp={Math.max(0, profile?.xp || 0)}
        streak={Math.max(0, profile?.streak || 0)}
        revisionDue={Math.max(0, revisionDue)}
        plannedLessons={Math.max(0, plannedLessons)}
        semesters={semesters}
      />
    </div>
  )
}

function normalizeSemester(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6
    ? Number(value)
    : 3
}

function normalizeDailyMinutes(value: number | null | undefined) {
  return Number.isFinite(value) && Number(value) >= 10 && Number(value) <= 600
    ? Number(value)
    : 90
}
