import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { ExamsClient } from './exams-client'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/exams')

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
      semesterNumber = dbUser.semesterNumber || 1
    }
  } catch {}
  const subjects = getManifestSubjectsForSemester(programmeCode, semesterNumber)
  const subjectsWithQuizCount = subjects.map(s => {
    const notes = getSubjectNotes(s.code)
    const quizCount = notes ? notes.units.reduce((sum, u) => sum + u.lessons.reduce((s2, l) => s2 + l.practiceQuestions.length, 0), 0) : 0
    return { code: s.code, name: s.name, credits: s.credits, quizCount, coverageFocus: s.coverageFocus }
  })

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Exams &amp; Practice Tests</h1>
        <p className="mt-1 text-sm text-muted-foreground">Test your knowledge with practice quizzes, chapter tests, and mock exams.</p>
        <div className="mt-6">
          <ExamsClient subjects={subjectsWithQuizCount} />
        </div>
      </div>
    </main>
  )
}
