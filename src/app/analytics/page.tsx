import Link from 'next/link'
import { redirect } from 'next/navigation'
import { AlertTriangle, BarChart3, Brain, Clock3, RotateCw, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getAcademicOverview, getMasteryRows } from '@/lib/academics/analytics-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

const subjectNames: Record<string, string> = { physics: 'Physics', chemistry: 'Chemistry', mathematics: 'Mathematics', biology: 'Biology', english: 'English' }

export default async function AnalyticsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/analytics')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const [overview, mastery] = await Promise.all([getAcademicOverview(user.id), getMasteryRows(user.id)])
  const weak = mastery.filter((row) => row.masteryScore !== null).slice(0, 5)

  const metrics = [
    { label: 'Questions attempted', value: overview.questionsAttempted.toLocaleString(), icon: Target },
    { label: 'Accuracy', value: overview.accuracy === null ? '—' : `${overview.accuracy}%`, icon: BarChart3 },
    { label: 'Avg. solve time', value: overview.averageTimeSeconds === null ? '—' : `${Math.round(overview.averageTimeSeconds)}s`, icon: Clock3 },
    { label: 'Revision due', value: overview.revisionDue.toLocaleString(), icon: RotateCw },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Learning analytics</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Understand what’s actually improving.</h1>
          <p className="mt-3 text-muted-foreground">No sample charts and no invented percentages. Lernio only shows academic insights after your real practice creates enough data.</p>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {metrics.map((metric) => (
            <div key={metric.label} className="rounded-2xl border border-border bg-card p-5">
              <metric.icon className="h-5 w-5 text-primary" />
              <p className="mt-4 text-2xl font-bold">{metric.value}</p>
              <p className="mt-1 text-xs text-muted-foreground">{metric.label}</p>
            </div>
          ))}
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.2fr_.8fr]">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><Brain className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Mastery map</h2></div>
            {mastery.length ? (
              <div className="mt-5 space-y-4">
                {mastery.slice(0, 12).map((row) => {
                  const score = row.masteryScore === null ? null : Math.round(row.masteryScore)
                  return (
                    <div key={`${row.subjectSlug}-${row.chapterSlug}-${row.topicSlug ?? ''}`}>
                      <div className="mb-2 flex items-center justify-between gap-4 text-sm">
                        <div className="min-w-0"><p className="truncate font-medium">{row.chapterSlug.replaceAll('-', ' ')}</p><p className="text-xs text-muted-foreground">{subjectNames[row.subjectSlug] ?? row.subjectSlug} · {row.attempts} attempts</p></div>
                        <span className="shrink-0 font-semibold">{score === null ? 'Not enough data' : `${score}%`}</span>
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${score ?? 0}%` }} /></div>
                    </div>
                  )
                })}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">Solve academic practice questions to build your mastery map. Lernio won’t guess your strengths before it has evidence.</div>
            )}
          </section>

          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-center gap-2"><AlertTriangle className="h-5 w-5 text-amber-500" /><h2 className="text-xl font-bold">Needs attention</h2></div>
            {weak.length ? (
              <div className="mt-5 space-y-3">
                {weak.map((row, index) => (
                  <Link key={`${row.subjectSlug}-${row.chapterSlug}-${index}`} href={`/practice/session?class=${profile.classLevel === 'DROPPER' ? '12' : profile.classLevel}&subject=${row.subjectSlug}&chapter=${row.chapterSlug}`} className="block rounded-xl border border-border p-4 hover:bg-accent/40">
                    <div className="flex items-start justify-between gap-3"><div><p className="text-sm font-semibold capitalize">{row.chapterSlug.replaceAll('-', ' ')}</p><p className="mt-1 text-xs text-muted-foreground">{subjectNames[row.subjectSlug] ?? row.subjectSlug}</p></div><span className="text-sm font-bold">{row.masteryScore === null ? '—' : `${Math.round(row.masteryScore)}%`}</span></div>
                  </Link>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">No evidence-based weak topics yet.</div>
            )}
            <div className="mt-4 rounded-xl bg-muted/50 p-3 text-xs text-muted-foreground">Open mistakes: {overview.mistakesOpen}. Recommendations appear only from stored attempts, timing and mastery data.</div>
          </section>
        </div>
      </main>
      <Footer />
    </div>
  )
}
