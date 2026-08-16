import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowRight,
  BarChart3,
  BookOpen,
  Brain,
  CalendarDays,
  Clock3,
  Flame,
  GraduationCap,
  RotateCw,
  Sparkles,
  Target,
  Trophy,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubjects } from '@/lib/academics/curriculum'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

const subjectLabel: Record<string, string> = {
  physics: 'Physics',
  chemistry: 'Chemistry',
  mathematics: 'Mathematics',
  biology: 'Biology',
  english: 'English',
  'computer-science': 'Computer Science',
  'physical-education': 'Physical Education',
}

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/dashboard')
  if (user.role === 'admin') redirect('/admin')

  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const student = await db.user.findUnique({
    where: { id: user.id },
    select: { streak: true, xp: true, dailyMins: true },
  }).catch(() => null)

  const recentlyViewed = await db.recentlyViewed.findMany({
    where: { userId: user.id },
    orderBy: { viewedAt: 'desc' },
    take: 3,
    select: { title: true, href: true },
  }).catch(() => [])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : hour < 21 ? 'Good evening' : 'Still studying'
  const firstName = user.name.split(' ')[0]
  const jeeEnabled = isJeeProfile(profile)
  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]
  const curriculum = classLevels.flatMap((classLevel) => getCurriculumSubjects(classLevel, profile.subjects))
  const weakSubjects = profile.weakSubjects.filter((subject) => profile.subjects.includes(subject))
  const suggestedSubject = weakSubjects[0] ?? profile.subjects[0]
  const suggestedName = suggestedSubject ? subjectLabel[suggestedSubject] ?? suggestedSubject : null
  const dailyMins = profile.dailyStudyGoal || student?.dailyMins || 120

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-7 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-2xl">
              <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                <span>{profile.board}</span><span className="text-muted-foreground">•</span>
                <span>{profile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${profile.classLevel}`}</span>
                <span className="text-muted-foreground">•</span><span>{profile.stream}</span>
              </div>
              <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">{greeting}, {firstName}.</h1>
              <p className="mt-2 text-lg text-muted-foreground">Know what to study next.</p>
            </div>
            <div className="flex gap-3">
              <div className="min-w-24 rounded-2xl border border-border bg-background/60 p-3 text-center">
                <Flame className="mx-auto h-5 w-5 text-orange-500" />
                <p className="mt-1 text-xl font-bold">{student?.streak ?? 0}</p>
                <p className="text-[11px] text-muted-foreground">day streak</p>
              </div>
              <div className="min-w-24 rounded-2xl border border-border bg-background/60 p-3 text-center">
                <Clock3 className="mx-auto h-5 w-5 text-primary" />
                <p className="mt-1 text-xl font-bold">{dailyMins}</p>
                <p className="text-[11px] text-muted-foreground">min target</p>
              </div>
            </div>
          </div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
          <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Today’s plan</p>
                <h2 className="mt-1 text-2xl font-bold">What should I study today?</h2>
              </div>
              <Sparkles className="h-5 w-5 text-primary" />
            </div>

            {suggestedName ? (
              <div className="mt-5 rounded-2xl border border-primary/20 bg-primary/5 p-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  {weakSubjects.length ? 'Based on a subject you marked as difficult' : 'Start your first study session'}
                </p>
                <div className="mt-2 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="text-xl font-bold">{suggestedName}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">Choose a chapter, learn the concept, then practise it.</p>
                  </div>
                  <Link href="/learn" className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                    Start studying <ArrowRight className="h-4 w-4" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">Add subjects in Academic Settings to build your study workspace.</div>
            )}

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <Link href="/practice" className="rounded-2xl border border-border p-4 transition hover:bg-accent/50">
                <Target className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Practice</p><p className="mt-1 text-xs text-muted-foreground">Topic, chapter or mixed questions</p>
              </Link>
              <Link href="/revision" className="rounded-2xl border border-border p-4 transition hover:bg-accent/50">
                <RotateCw className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Revision</p><p className="mt-1 text-xs text-muted-foreground">Review what is actually due</p>
              </Link>
              <Link href="/tutor" className="rounded-2xl border border-border p-4 transition hover:bg-accent/50">
                <Brain className="h-5 w-5 text-primary" /><p className="mt-3 font-semibold">Ask AI Tutor</p><p className="mt-1 text-xs text-muted-foreground">Explain, hint, solve or quiz</p>
              </Link>
            </div>
          </section>

          <aside className="space-y-5">
            <section className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Preparation</p>
              <div className="mt-4 space-y-3">
                {profile.targetExams.map((exam) => (
                  <div key={exam} className="flex items-center justify-between rounded-xl bg-muted/50 px-3 py-2.5">
                    <span className="text-sm font-medium">{exam === 'BOARDS' ? 'Boards' : exam === 'JEE_MAIN' ? 'JEE Main' : 'JEE Advanced'}</span>
                    <span className="text-xs text-muted-foreground">{profile.targetYear}</span>
                  </div>
                ))}
              </div>
              <p className="mt-3 text-xs text-muted-foreground">Exam dates are configurable; Lernio does not hardcode countdowns before a date is set.</p>
            </section>

            {jeeEnabled && (
              <section className="rounded-3xl border border-border bg-card p-5">
                <div className="flex items-center gap-2"><GraduationCap className="h-5 w-5 text-primary" /><h2 className="font-semibold">JEE workspace</h2></div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
                  <Link href="/practice?mode=pyq" className="rounded-xl border border-border p-3 hover:bg-accent">PYQ practice</Link>
                  <Link href="/exams?mode=jee" className="rounded-xl border border-border p-3 hover:bg-accent">Mock tests</Link>
                </div>
              </section>
            )}
          </aside>
        </div>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/learn" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <BookOpen className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">Learn</h2><p className="mt-1 text-sm text-muted-foreground">{curriculum.length} curriculum subjects ready</p>
          </Link>
          <Link href="/planner" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <CalendarDays className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">Planner</h2><p className="mt-1 text-sm text-muted-foreground">Turn goals into connected study tasks</p>
          </Link>
          <Link href="/analytics" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <BarChart3 className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">Analytics</h2><p className="mt-1 text-sm text-muted-foreground">Understand performance without fake precision</p>
          </Link>
          <Link href="/achievements" className="group rounded-2xl border border-border bg-card p-5 hover:border-primary/40">
            <Trophy className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">Consistency</h2><p className="mt-1 text-sm text-muted-foreground">{student?.xp ?? 0} XP earned from real activity</p>
          </Link>
        </section>

        <section className="mt-6 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-3">
            <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Continue</p><h2 className="mt-1 text-xl font-bold">Recent learning</h2></div>
            <Link href="/learn" className="text-sm font-medium text-primary">Open Learn</Link>
          </div>
          {recentlyViewed.length ? (
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {recentlyViewed.map((item) => (
                <Link key={`${item.href}-${item.title}`} href={item.href} className="rounded-xl border border-border p-4 hover:bg-accent/50">
                  <p className="line-clamp-2 text-sm font-medium">{item.title}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="mt-4 rounded-xl border border-dashed border-border p-5 text-sm text-muted-foreground">Your recent topics will appear here after you start learning.</div>
          )}
        </section>
      </main>
      <Footer />
    </div>
  )
}
