import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, DatabaseZap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubject } from '@/lib/academics/curriculum'
import { getPracticeQuestions } from '@/lib/academics/practice-store'
import type { SubjectSlug } from '@/lib/academics/types'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { PracticeRunner } from './practice-runner'

export const dynamic = 'force-dynamic'

export default async function PracticeSessionPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const params = await searchParams
  const classLevel = typeof params.class === 'string' ? params.class : ''
  const subjectSlug = typeof params.subject === 'string' ? params.subject : ''
  const chapterSlug = typeof params.chapter === 'string' ? params.chapter : undefined
  const mode = typeof params.mode === 'string' ? params.mode : 'topic'

  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/practice')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  if ((classLevel !== '11' && classLevel !== '12') || !profile.subjects.includes(subjectSlug as SubjectSlug)) redirect('/practice')
  if (profile.classLevel !== 'DROPPER' && profile.classLevel !== classLevel) redirect('/practice')

  const subject = getCurriculumSubject(classLevel, subjectSlug)
  if (!subject) redirect('/practice')
  const chapter = chapterSlug ? subject.chapters.find((item) => item.slug === chapterSlug) : null
  if (chapterSlug && !chapter) redirect('/practice')

  const pyqMode = mode === 'pyq'
  if (pyqMode && (!isJeeProfile(profile) || !['physics', 'chemistry', 'mathematics'].includes(subjectSlug))) redirect('/practice')

  const questions = await getPracticeQuestions({
    classLevel,
    subjectSlug,
    chapterSlug,
    examType: pyqMode ? 'JEE_MAIN' : undefined,
    sourceType: pyqMode ? 'PYQ' : undefined,
    limit: 15,
  })

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-4xl px-5 py-7 sm:px-6">
        <Link href="/practice" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Practice hub</Link>
        <header className="mt-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Class {classLevel} · {subject.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight">{chapter?.name ?? `${subject.name} practice`}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{pyqMode ? 'Verified JEE Main PYQ practice' : 'Adaptive-ready academic practice session'}</p>
        </header>

        {questions.length ? (
          <div className="mt-7"><PracticeRunner questions={questions} practiceMode={mode.toUpperCase()} /></div>
        ) : (
          <section className="mt-7 rounded-3xl border border-dashed border-border bg-card p-8 text-center">
            <DatabaseZap className="mx-auto h-8 w-8 text-muted-foreground" />
            <h2 className="mt-4 text-xl font-semibold">No verified questions published here yet.</h2>
            <p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">{pyqMode ? 'No source-verified JEE Main PYQs match this selection yet. Lernio will not substitute AI-generated or unverified questions.' : 'The practice engine is ready, but Lernio will not fill this screen with fake questions or mislabel generated content as official exam material.'}</p>
            <Link href="/learn" className="mt-5 inline-flex rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">Continue learning</Link>
          </section>
        )}
      </main>
    </div>
  )
}
