import { redirect } from 'next/navigation'
import { TopBar } from "@/components/layout/top-bar"
import { Footer } from "@/components/layout/footer"
import { BackButton } from "@/components/ui/back-button"
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { PlannerClient } from './planner-client'

export const dynamic = 'force-dynamic'

export default async function PlannerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/planner')

  // Get user's actual semester from DB
  let programmeCode = 'DCOMP'
  let semesterNumber = 1
  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { semesterNumber: true, departmentCode: true },
    })
    if (dbUser) {
      programmeCode = dbUser.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'
      semesterNumber = dbUser.semesterNumber || 3
    }
  } catch {}
  const subjects = getManifestSubjectsForSemester(programmeCode, semesterNumber)

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <BackButton />
        <h1 className="text-2xl font-bold">Study Planner</h1>
        <p className="mt-1 text-sm text-muted-foreground">Plan your study week based on your subjects and weak topics.</p>
        <div className="mt-6">
          <PlannerClient subjects={subjects.map(s => ({ code: s.code, name: s.name, credits: s.credits, resources: s.resources.length, coverageFocus: s.coverageFocus }))} />
        </div>
      </div>
    </main>
      <Footer />
    </div>
  )
}
