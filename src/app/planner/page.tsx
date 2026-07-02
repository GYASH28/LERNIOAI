import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { PlannerClient } from './planner-client'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/planner')

  const subjects = getManifestSubjectsForSemester('DCOMP', 3)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Study Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Plan your study week based on your subjects and weak topics.</p>
        <div className="mt-6">
          <PlannerClient subjects={subjects.map(s => ({ code: s.code, name: s.name, credits: s.credits, resources: s.resources.length, coverageFocus: s.coverageFocus }))} />
        </div>
      </div>
    </main>
  )
}
