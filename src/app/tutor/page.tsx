import { redirect } from 'next/navigation'
import { Brain, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumChapter, getCurriculumSubject } from '@/lib/academics/curriculum'
import type { SubjectSlug } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { TutorAcademicClient } from './tutor-academic-client'

export const dynamic = 'force-dynamic'

export default async function TutorPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/tutor')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const params = await searchParams
  const requestedClass = typeof params.class === 'string' && (params.class === '11' || params.class === '12') ? params.class : null
  const requestedSubject = typeof params.subject === 'string' ? params.subject : null
  const requestedChapter = typeof params.chapter === 'string' ? params.chapter : null
  const requestedTopic = typeof params.topic === 'string' ? params.topic.replaceAll('-', ' ') : null

  const classAllowed = requestedClass && (profile.classLevel === 'DROPPER' || profile.classLevel === requestedClass)
  const subjectAllowed = requestedSubject && profile.subjects.includes(requestedSubject as SubjectSlug)
  const subject = classAllowed && subjectAllowed ? getCurriculumSubject(requestedClass, requestedSubject) : null
  const chapter = subject && requestedChapter ? getCurriculumChapter(requestedClass, requestedSubject, requestedChapter) : null

  const profileLabel = `${profile.board} · ${profile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${profile.classLevel}`} · ${profile.stream}`
  const examLabel = profile.targetExams.map((exam) => exam === 'BOARDS' ? 'Boards' : exam === 'JEE_MAIN' ? 'JEE Main' : 'JEE Advanced').join(' + ')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><Brain className="h-4 w-4" /> AI Tutor</div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Learn with context, not canned answers.</h1>
              <p className="mt-2 text-sm text-muted-foreground">{profileLabel} · {examLabel}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><Sparkles className="h-4 w-4" /> Academic profile active</div>
          </div>
        </header>
        <TutorAcademicClient academicContext={{
          profileLabel,
          subjectName: subject?.name,
          chapterName: chapter?.name,
          topicName: requestedTopic || undefined,
          examLabel,
        }} />
      </main>
      <Footer />
    </div>
  )
}
