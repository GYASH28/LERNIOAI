import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, BookOpen, Brain, RotateCw, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubject } from '@/lib/academics/curriculum'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function SubjectPage({ params }: { params: Promise<{ classLevel: string; subjectSlug: string }> }) {
  const { classLevel, subjectSlug } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')

  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  if (classLevel !== '11' && classLevel !== '12') notFound()

  const allowedClass = profile.classLevel === 'DROPPER' || profile.classLevel === classLevel
  if (!allowedClass || !profile.subjects.includes(subjectSlug as never)) notFound()

  const subject = getCurriculumSubject(classLevel, subjectSlug)
  if (!subject) notFound()

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <Link href="/learn" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> All subjects
        </Link>

        <header className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">CBSE · Class {classLevel}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{subject.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Learn concepts, practise questions, revise intelligently and connect every chapter to the right exam mode.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <Link href={`/practice?subject=${subject.slug}&class=${classLevel}`} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground">
              <Target className="h-4 w-4" /> Practice {subject.shortName}
            </Link>
            <Link href={`/tutor?subject=${subject.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
              <Brain className="h-4 w-4" /> Ask AI Tutor
            </Link>
            <Link href={`/revision?subject=${subject.slug}`} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2 text-sm font-semibold hover:bg-accent">
              <RotateCw className="h-4 w-4" /> Revise
            </Link>
          </div>
        </header>

        <section className="mt-8">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">Curriculum</p>
              <h2 className="mt-1 text-2xl font-bold">Chapters</h2>
            </div>
            <span className="text-sm text-muted-foreground">{subject.chapters.length} chapters</span>
          </div>

          <div className="space-y-2">
            {subject.chapters.map((chapter) => (
              <Link
                key={chapter.id}
                href={`/learn/class/${classLevel}/${subject.slug}/${chapter.slug}`}
                className="group flex items-center gap-4 rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40 hover:bg-accent/30 sm:p-5"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">
                  {chapter.order}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="font-semibold">{chapter.name}</h3>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-1"><BookOpen className="h-3 w-3" /> Learn</span>
                    <span>•</span><span>Practice</span><span>•</span><span>Revision</span><span>•</span><span>Test</span>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
              </Link>
            ))}
          </div>
        </section>
      </main>
    </div>
  )
}
