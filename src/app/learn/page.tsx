import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import {
  LearningOSMobileFirstHome,
  type LearningOSSemesterSummary,
} from '@/components/learning/learning-os-mobile-first-home'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
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
  }).catch(() => null)

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

  const semesters: LearningOSSemesterSummary[] = [1, 2, 3, 4, 5, 6].map((semesterNumber) => ({
    number: semesterNumber,
    subjects: getManifestSubjectsForSemester(programme, semesterNumber).map((subject) => {
      const code = programme === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
      const notes = getSubjectNotes(code) ?? getSubjectNotes(subject.code)
      const lessonCount = notes?.units.reduce((sum, unit) => sum + unit.lessons.length, 0) ?? 0
      const directVideoCount = subject.resources.filter((resource) =>
        Boolean(resource.videoId || /[?&]v=[\w-]{11}/.test(resource.url) || /youtu\.be\/[\w-]{11}/.test(resource.url)),
      ).length

      return {
        code,
        name: subject.name,
        category: subject.category,
        priority: subject.priority,
        credits: subject.credits,
        coverageFocus: subject.coverageFocus,
        lessonCount,
        videoCount: directVideoCount,
        hasDetailedNotes: Boolean(notes),
        href: `/learn/${programme}/semester/${semesterNumber}/subject/${code}`,
      }
    }),
  }))

  return (
    <div className="page-wipe mx-auto w-full max-w-7xl px-3 py-3 sm:px-6 sm:py-6 lg:px-8">
      <LearningOSMobileFirstHome
        userName={profile?.name || user.name}
        programme={programme}
        currentSemester={currentSemester}
        dailyMinutes={profile?.dailyMins || 90}
        xp={profile?.xp || 0}
        streak={profile?.streak || 0}
        revisionDue={revisionDue}
        plannedLessons={plannedLessons}
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
