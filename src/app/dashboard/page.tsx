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
import { ContinueLearningCard } from '@/components/dashboard/continue-learning-card'
import { StreakHeatmap } from '@/components/dashboard/streak-heatmap'
import { ExamCountdown } from '@/components/dashboard/exam-countdown'
import { ProgressRing } from '@/components/learning/progress-ring'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/dashboard')

  // Fetch user's XP, streak, and recent activity
  let xp = 0
  let streak = 0
  let level = 1
  let userSemester: number | null = null
  let userDept: string | null = null
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
      userSemester = dbUser.semesterNumber
      userDept = dbUser.departmentCode
    }

    recentlyViewed = await db.recentlyViewed.findMany({
      where: { userId: user.id },
      orderBy: { viewedAt: 'desc' },
      take: 3,
      select: { title: true, href: true, viewedAt: true },
    }).catch(() => [])
  } catch {
    // DB unavailable — use defaults
  }

  // Determine programme and semester from user's DB record
  const programmeCode = userDept === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semesterNumber = userSemester || 3

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
        </section>

        {/* ─── Continue Where You Left Off ─── */}
        <section className="mt-6">
          <ContinueLearningCard />
        </section>

        {/* ─── Streak Heatmap + Exam Countdown ─── */}
        <section className="mt-6 grid gap-4 lg:grid-cols-2">
          <StreakHeatmap />
          <ExamCountdown examDate={null} />
        </section>

        {/* ─── My Subjects with Progress Rings ─── */}
        <section className="mt-6">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">My Subjects</h2>
            <Link href="/learn" className="text-xs text-muted-foreground hover:text-primary">View all</Link>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {subjects.slice(0, 6).map((subject) => {
              const subjectCode = subject.code
              const subjectHref = `/learn/DCOMP/semester/${semesterNumber}/subject/${subjectCode}`
              return (
                <Link key={subjectCode} href={subjectHref} className="group rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">{subjectCode}</span>
                    <ProgressRing value={Math.min((subject.resources.length * 10), 100)} size={36} label="" />
                  </div>
                  <h3 className="mt-1 truncate text-sm font-semibold">{subject.name}</h3>
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1"><PlayCircle className="h-3 w-3" />{subject.resources.length} videos</span>
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
