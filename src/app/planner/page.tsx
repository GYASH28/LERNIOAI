import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, CalendarCheck, Clock3, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getActiveStudyPlan } from '@/lib/academics/planner-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { PlannerActions } from './planner-actions'

export const dynamic = 'force-dynamic'

const subjectNames: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics', biology: 'Biology', english: 'English' }

function dateKey(value: Date) {
  return new Date(value).toISOString().slice(0, 10)
}

export default async function PlannerPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/planner')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const { plan, tasks } = await getActiveStudyPlan(user.id)
  const grouped = new Map<string, typeof tasks>()
  for (const task of tasks) {
    const key = dateKey(task.scheduledDate)
    grouped.set(key, [...(grouped.get(key) ?? []), task])
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Study Planner</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Turn your syllabus into today’s work.</h1><p className="mt-3 text-muted-foreground">Plans create real links into Learn, Practice and Revision—not generic todo text. Your onboarding goal of {profile.dailyStudyGoal} minutes/day is the baseline.</p></div>
          <PlannerActions hasPlan={Boolean(plan)} />
        </header>

        {plan ? (
          <section className="mt-8">
            <div className="mb-5 rounded-2xl border border-border bg-card p-5"><div className="flex flex-wrap items-center justify-between gap-4"><div><div className="flex items-center gap-2 font-semibold"><Sparkles className="h-4 w-4 text-primary" /> {plan.title}</div><p className="mt-1 text-xs text-muted-foreground">Generated from your academic profile and published curriculum. As mastery data grows, this layer can adapt to performance.</p></div><span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">Active</span></div></div>
            <div className="space-y-6">
              {[...grouped.entries()].map(([date, dayTasks]) => {
                const dateValue = new Date(`${date}T00:00:00`)
                return (
                  <div key={date}>
                    <div className="mb-3 flex items-center gap-2"><CalendarCheck className="h-4 w-4 text-primary" /><h2 className="font-semibold">{dateValue.toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'short' })}</h2><span className="text-xs text-muted-foreground">{dayTasks.reduce((sum, task) => sum + task.estimatedMinutes, 0)} min</span></div>
                    <div className="grid gap-3 md:grid-cols-3">
                      {dayTasks.map((task) => (
                        <Link key={task.id} href={task.targetHref} className="group rounded-2xl border border-border bg-card p-4 transition hover:border-primary/40">
                          <div className="flex items-center justify-between gap-3"><span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">{task.taskType}</span><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div>
                          <h3 className="mt-4 font-semibold">{subjectNames[task.subjectSlug] ?? task.subjectSlug}</h3>
                          <p className="mt-1 text-sm capitalize text-muted-foreground">{task.chapterSlug?.replaceAll('-', ' ') ?? 'Study task'}</p>
                          <p className="mt-4 flex items-center gap-1.5 text-xs text-muted-foreground"><Clock3 className="h-3.5 w-3.5" /> {task.estimatedMinutes} min</p>
                        </Link>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ) : (
          <section className="mt-8 rounded-3xl border border-dashed border-border bg-card p-8 text-center"><CalendarCheck className="mx-auto h-9 w-9 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">No study plan yet.</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Create your first connected plan. Lernio will start from your class, stream, weak subjects and daily time target instead of old diploma credits.</p></section>
        )}
      </main>
      <Footer />
    </div>
  )
}
