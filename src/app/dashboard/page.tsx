import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import {
  BookOpen,
  PlayCircle,
  Target,
  Flame,
  Zap,
  TrendingUp,
  ArrowRight,
  Calendar,
  Award,
} from 'lucide-react'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/dashboard')

  // Fetch user's XP, streak, and recent activity
  let xp = 0
  let streak = 0
  let level = 1
  let recentlyViewed: { title: string; href: string; viewedAt: Date }[] = []

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: { xp: true, streak: true, level: true, semesterNumber: true, departmentCode: true },
    })
    if (dbUser) {
      xp = dbUser.xp
      streak = dbUser.streak
      level = dbUser.level
    }

    recentlyViewed = await db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: 'desc' },
      take: 3,
      select: { title: true, href: true, viewedAt: true },
    })
  } catch {
    // DB unavailable — use defaults
  }

  // Determine programme and semester
  const programmeCode = user.role === 'student' ? 'DCOMP' : 'DCOMP'
  const semesterNumber = 3

  // Get manifest subjects for the user's semester
  const subjects = getManifestSubjectsForSemester(programmeCode, semesterNumber)
  const totalResources = subjects.reduce((sum, s) => sum + s.resources.length, 0)

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        {/* ─── Semester Hero ─── */}
        <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {programmeCode} / R23 / Semester {semesterNumber}
              </p>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">
                Welcome back, {user.name.split(' ')[0]}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">
                You have {subjects.length} subjects with {totalResources} curated lectures this semester.
              </p>
            </div>
            <div className="flex gap-3">
              <div className="rounded-lg border border-border bg-background px-4 py-2 text-center">
                <Flame className="mx-auto h-5 w-5 text-orange-500" />
                <p className="mt-1 text-xl font-bold">{streak}</p>
                <p className="text-[10px] text-muted-foreground">Day streak</p>
              </div>
              <div className="rounded-lg border border-border bg-background px-4 py-2 text-center">
                <Zap className="mx-auto h-5 w-5 text-amber-500" />
                <p className="mt-1 text-xl font-bold">{xp}</p>
                <p className="text-[10px] text-muted-foreground">XP · L{level}</p>
              </div>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href="/learn"
              className="inline-flex items-center gap-2 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
            >
              <BookOpen className="h-4 w-4" />
              Continue Learning
            </Link>
            <Link
              href="/tutor"
              className="inline-flex items-center gap-2 rounded-md border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
            >
              <PlayCircle className="h-4 w-4" />
              Ask LEO
            </Link>
          </div>
        </section>

        {/* ─── Continue Learning ─── */}
        {recentlyViewed.length > 0 && (
          <section className="mt-6">
            <h2 className="mb-3 text-lg font-semibold">Continue Learning</h2>
            <div className="grid gap-3 sm:grid-cols-3">
              {recentlyViewed.map((item, i) => (
                <Link
                  key={i}
                  href={item.href}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5"
                >
                  <div className="flex items-center gap-2">
                    <PlayCircle className="h-4 w-4 text-primary" />
                    <p className="text-xs text-muted-foreground">
                      {new Date(item.viewedAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                  <p className="mt-2 truncate text-sm font-medium">{item.title}</p>
                  <div className="mt-2 flex items-center gap-1 text-xs text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Resume <ArrowRight className="h-3 w-3" />
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* ─── My Subjects ─── */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Subjects</h2>
            <Link href="/learn" className="text-xs text-muted-foreground hover:text-primary">
              View all
            </Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.slice(0, 6).map((subject) => {
              const subjectCode = subject.code
              const subjectHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`
              return (
                <Link
                  key={subjectCode}
                  href={subjectHref}
                  className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {subjectCode}
                    </span>
                    {subject.priority === 'critical' && (
                      <span className="rounded bg-red-600/10 px-1 py-0.5 text-[9px] font-bold uppercase text-red-600">
                        Critical
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold">{subject.name}</h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <PlayCircle className="h-3 w-3" />
                      {subject.resources.length} videos
                    </span>
                    <span>{subject.credits} credits</span>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>

        {/* ─── Today's Goal + Quick Actions ─── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-5 lg:col-span-1">
            <div className="flex items-center gap-2">
              <Target className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Today&apos;s Goal</h3>
            </div>
            <p className="mt-3 text-3xl font-bold">120 min</p>
            <p className="text-xs text-muted-foreground">Study 2 hours today to maintain your streak</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: '0%' }} />
            </div>
          </div>

          <div className="rounded-lg border border-border bg-card p-5 lg:col-span-2">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              <h3 className="text-sm font-semibold">Quick Actions</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              <Link href="/learn" className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center transition-colors hover:bg-accent/5">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Learn</span>
              </Link>
              <Link href="/practice" className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center transition-colors hover:bg-accent/5">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Practice</span>
              </Link>
              <Link href="/tutor" className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center transition-colors hover:bg-accent/5">
                <PlayCircle className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Ask LEO</span>
              </Link>
              <Link href="/achievements" className="flex flex-col items-center gap-1 rounded-md border border-border p-3 text-center transition-colors hover:bg-accent/5">
                <Award className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium">Awards</span>
              </Link>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
