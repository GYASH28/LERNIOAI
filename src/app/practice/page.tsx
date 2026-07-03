import { redirect } from 'next/navigation'
import { BackButton } from "@/components/ui/back-button"
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { PracticeClient } from './practice-client'

export const dynamic = 'force-dynamic'

export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/practice')

  const subjects = getManifestSubjectsForSemester('DCOMP', 3)
  const subjectsWithQuizCount = subjects.map(s => {
    const notes = getSubjectNotes(s.code)
    const quizCount = notes ? notes.units.reduce((sum, u) => sum + u.lessons.reduce((s2, l) => s2 + l.practiceQuestions.length, 0), 0) : 0
    return { code: s.code, name: s.name, quizCount, coverageFocus: s.coverageFocus }
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-6 sm:px-6 lg:px-8">
          <BackButton />
        <h1 className="text-2xl font-bold">Practice</h1>
        <p className="mt-1 text-sm text-muted-foreground">Quick practice quizzes with instant feedback. Choose a subject to start.</p>
        <div className="mt-6">
          <PracticeClient subjects={subjectsWithQuizCount} />
        </div>
      </div>
    </main>
  )
}
