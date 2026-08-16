import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, Brain, FileText, RotateCw, Sigma, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumChapter, getCurriculumSubject } from '@/lib/academics/curriculum'
import type { SubjectSlug } from '@/lib/academics/types'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function ChapterPage({ params }: { params: Promise<{ classLevel: string; subjectSlug: string; chapterSlug: string }> }) {
  const { classLevel, subjectSlug, chapterSlug } = await params
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  if (classLevel !== '11' && classLevel !== '12') notFound()
  if (profile.classLevel !== 'DROPPER' && profile.classLevel !== classLevel) notFound()
  if (!profile.subjects.includes(subjectSlug as SubjectSlug)) notFound()

  const subject = getCurriculumSubject(classLevel, subjectSlug)
  const chapter = getCurriculumChapter(classLevel, subjectSlug, chapterSlug)
  if (!subject || !chapter) notFound()
  const jeeEnabled = isJeeProfile(profile) && ['physics', 'chemistry', 'mathematics'].includes(subjectSlug)

  const actions = [
    { title: 'Practice questions', description: 'Solve published questions for this chapter.', icon: Target, href: `/practice/session?class=${classLevel}&subject=${subjectSlug}&chapter=${chapterSlug}` },
    { title: 'Ask AI Tutor', description: 'Open the tutor with this chapter as your study context.', icon: Brain, href: `/tutor?class=${classLevel}&subject=${subjectSlug}&chapter=${chapterSlug}` },
    { title: 'Revision', description: 'Review mistakes and due revision connected to your progress.', icon: RotateCw, href: '/revision' },
    { title: 'Formula / key results', description: 'Use the Formula Vault when verified cards are available.', icon: Sigma, href: '/revision/formulas' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <Link href={`/learn/class/${classLevel}/${subjectSlug}`} className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {subject.name}</Link>

        <header className="mt-6 rounded-3xl border border-border bg-card p-6 sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">CBSE · Class {classLevel} · {subject.name}</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">{chapter.name}</h1>
          <p className="mt-3 max-w-2xl text-muted-foreground">Learn the chapter, practise it, review mistakes and come back for revision from one connected workspace.</p>
          <div className="mt-5 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full bg-muted px-3 py-1.5">Boards</span>
            {jeeEnabled && <><span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">JEE Main</span><span className="rounded-full bg-primary/10 px-3 py-1.5 text-primary">JEE Advanced</span></>}
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {actions.map((action) => <Link key={action.title} href={action.href} className="rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40 hover:bg-accent/20"><action.icon className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">{action.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{action.description}</p></Link>)}
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-6">
          <div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Chapter learning content</h2></div>
          {chapter.topics.length ? (
            <div className="mt-5 space-y-3">{chapter.topics.map((topic) => <div key={topic.id} className="rounded-xl border border-border p-4"><p className="font-medium">{topic.name}</p></div>)}</div>
          ) : (
            <div className="mt-5 rounded-2xl border border-dashed border-border p-6">
              <div className="flex items-start gap-3"><FileText className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" /><div><h3 className="font-semibold">Detailed topic content is not published yet.</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">The chapter exists in the verified curriculum structure, but Lernio will not invent notes, diagrams, videos or topic mappings merely to fill the screen. Original learning content can be published here as it is reviewed.</p></div></div>
            </div>
          )}
        </section>
      </main>
    </div>
  )
}
