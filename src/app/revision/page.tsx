import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Brain, FileText, RotateCw, Sigma, TriangleAlert } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getRevisionSummary } from '@/lib/academics/revision-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function RevisionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const summary = await getRevisionSummary(user.id)

  const modes = [
    { title: 'Revision Queue', description: 'Concepts scheduled from performance, confidence and review history.', value: summary.due, label: 'due now', icon: RotateCw, href: '/revision/queue' },
    { title: 'Mistake Notebook', description: 'Questions you got wrong, kept for deliberate re-practice.', value: summary.mistakes, label: 'open mistakes', icon: TriangleAlert, href: '/revision/mistakes' },
    { title: 'Formula Revision', description: 'Saved Physics, Physical Chemistry and Mathematics formulae.', value: null, label: 'formula vault', icon: Sigma, href: '/revision/formulas' },
    { title: 'Quick Chapter Revision', description: 'Short recap modes connected to curriculum chapters.', value: null, label: 'choose chapter', icon: FileText, href: '/learn' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Revision OS</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Revise before you forget.</h1>
          <p className="mt-3 text-muted-foreground">Revision is driven by real attempts and due dates. Empty queues stay empty instead of being padded with demo cards.</p>
        </header>

        <section className="mt-7 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-7">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today</p><h2 className="mt-1 text-2xl font-bold">{summary.due} revision {summary.due === 1 ? 'item' : 'items'} due</h2><p className="mt-2 text-sm text-muted-foreground">{summary.repeatedMistakes ? `${summary.repeatedMistakes} repeated mistakes also need attention.` : 'You’re caught up on repeated mistakes.'}</p></div>
            <Link href={summary.due ? '/revision/queue' : '/revision/mistakes'} className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">{summary.due ? 'Start revision' : 'Review mistakes'} <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2">
          {modes.map((mode) => (
            <Link key={mode.title} href={mode.href} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40">
              <div className="flex items-start justify-between gap-4"><mode.icon className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
              <h2 className="mt-5 text-lg font-semibold">{mode.title}</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{mode.description}</p>
              <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-primary">{mode.value === null ? mode.label : `${mode.value} ${mode.label}`}</p>
            </Link>
          ))}
        </section>

        <section className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-card p-5">
          <Brain className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          <div><h2 className="font-semibold">Adaptive revision foundation</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">The new academic data layer stores mastery, repeated mistakes, review timing and confidence separately from the old diploma lesson system, so future spaced repetition can schedule the right concept without semester assumptions.</p></div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
