import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { getCurrentLearningContext } from '@/lib/learning/current-learning-context'
import { AuthenticatedPageShell } from '@/components/app/authenticated-page-shell'
import { CurrentLearningContextCard } from '@/components/app/current-learning-context-card'
import { PracticeClient } from './practice-client'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/practice')

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { semesterNumber: true, departmentCode: true },
  }).catch(() => null)

  const programmeCode = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semesterNumber = normalizeSemester(profile?.semesterNumber)
  const [subjects, context] = await Promise.all([
    Promise.resolve(getManifestSubjectsForSemester(programmeCode, semesterNumber)),
    getCurrentLearningContext(user.id, {
      programme: programmeCode,
      semester: semesterNumber,
    }),
  ])
  const subjectsWithQuizCount = subjects.map((subject) => {
    const notes = getSubjectNotes(subject.code)
    const quizCount = notes
      ? notes.units.reduce(
          (total, unit) => total + unit.lessons.reduce(
            (lessonTotal, lesson) => lessonTotal + (lesson.practiceQuestions?.length ?? 0),
            0,
          ),
          0,
        )
      : 0
    return {
      code: subject.code,
      name: subject.name,
      quizCount,
      coverageFocus: subject.coverageFocus,
    }
  })

  return (
    <AuthenticatedPageShell current="practice" maxWidth="5xl">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          {programmeCode} · Semester {semesterNumber}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Practice</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Use a focused quiz to expose the next concept you should repair—not just to collect a score.
        </p>
      </header>
      <div className="mt-5">
        <CurrentLearningContextCard context={context} />
      </div>
      <div className="mt-6">
        <PracticeClient subjects={subjectsWithQuizCount} />
      </div>
    </AuthenticatedPageShell>
  )
}

function normalizeSemester(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6
    ? Number(value)
    : 3
}
