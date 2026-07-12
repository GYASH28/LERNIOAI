import { redirect } from 'next/navigation'
import { TopBar } from "@/components/layout/top-bar"
import { Footer } from "@/components/layout/footer"
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { PracticeClient } from './practice-client'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/practice')

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
  const subjectsWithQuizCount = subjects.map(s => {
    const notes = getSubjectNotes(s.code)
    const quizCount = notes ? notes.units.reduce((sum, u) => sum + u.lessons.reduce((s2, l) => s2 + (l.practiceQuestions?.length ?? 0), 0), 0) : 0
    return { code: s.code, name: s.name, quizCount, coverageFocus: s.coverageFocus }
  })

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick practice quizzes with instant feedback. Choose a subject to start.</p>
        <div className="mt-6">
          <PracticeClient subjects={subjectsWithQuizCount} />
        </div>
      </div>
    </main>
      <Footer />
    </div>
  )
}
