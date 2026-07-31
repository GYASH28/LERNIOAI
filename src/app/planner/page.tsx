import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getCurrentLearningContext } from '@/lib/learning/current-learning-context'
import { AuthenticatedPageShell } from '@/components/app/authenticated-page-shell'
import { CurrentLearningContextCard } from '@/components/app/current-learning-context-card'
import { PlannerClient } from './planner-client'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/planner')

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: { semesterNumber: true, departmentCode: true },
  }).catch(() => null)

  const programmeCode = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semesterNumber = normalizeSemester(profile?.semesterNumber)
  const subjects = getManifestSubjectsForSemester(programmeCode, semesterNumber)
  const context = await getCurrentLearningContext(user.id, {
    programme: programmeCode,
    semester: semesterNumber,
  })

  return (
    <AuthenticatedPageShell current="planner" maxWidth="5xl">
      <header>
        <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">
          {programmeCode} · Semester {semesterNumber}
        </p>
        <h1 className="mt-1 text-2xl font-black tracking-tight">Study Planner</h1>
        <p className="mt-1 text-sm leading-6 text-muted-foreground">
          Convert unfinished lessons, weak topics and revision due dates into a realistic week.
        </p>
      </header>
      <div className="mt-5">
        <CurrentLearningContextCard context={context} compact />
      </div>
      <div className="mt-6">
        <PlannerClient
          subjects={subjects.map((subject) => ({
            code: subject.code,
            name: subject.name,
            credits: subject.credits,
            resources: subject.resources.length,
            coverageFocus: subject.coverageFocus,
          }))}
        />
      </div>
    </AuthenticatedPageShell>
  )
}

function normalizeSemester(value: number | null | undefined) {
  return Number.isInteger(value) && Number(value) >= 1 && Number(value) <= 6
    ? Number(value)
    : 3
}
