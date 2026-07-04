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
  Crown,
  Mail,
  Clock,
  Users,
  GraduationCap,
  ClipboardList,
  ChevronRight,
} from 'lucide-react'
import { getManifestSubjectsForSemester } from '@/lib/curriculum/manifest-data'
import { ContinueLearningCard } from '@/components/dashboard/continue-learning-card'
import { StreakHeatmap } from '@/components/dashboard/streak-heatmap'
import { ExamCountdown } from '@/components/dashboard/exam-countdown'
import { ProgressRing } from '@/components/learning/progress-ring'
import { ClassAvatar } from '@/components/class/class-avatar'

export const dynamic = 'force-dynamic'

export default async function DashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/dashboard')

  // Redirect role-based users to their dashboards
  if (user.role === 'admin') redirect('/admin')
  if (user.role === 'coordinator') redirect('/coordinator')
  if (user.role === 'teacher') redirect('/teacher-dashboard')
  if (user.role === 'cr') redirect('/cr')

  // Fetch user's XP, streak, class info, and recent activity
  let xp = 0
  let streak = 0
  let level = 1
  let userSemester: number | null = null
  let userDept: string | null = null
  let userDivision: string | null = null
  let recentlyViewed: { title: string; href: string; viewedAt: Date }[] = []
  let classInfo: {
    id: string
    alias: string | null
    avatarEmoji: string | null
    avatarColor: string | null
    departmentCode: string
    semesterNumber: number
    division: string
    room: string | null
    cr: { id: string; name: string; email: string; rollNumber: string | null } | null
    _count: { members: number }
  } | null = null
  let todaySlots: Array<{
    id: string
    subjectName: string | null
    startTime: string
    endTime: string
    room: string | null
    isBreak: boolean
  }> = []
  let attendancePct: number | null = null

  try {
    const dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        xp: true,
        streak: true,
        level: true,
        semesterNumber: true,
        departmentCode: true,
        division: true,
      },
    })
    if (dbUser) {
      xp = dbUser.xp
      streak = dbUser.streak
      level = dbUser.level
      userSemester = dbUser.semesterNumber
      userDept = dbUser.departmentCode
      userDivision = dbUser.division
    }

    recentlyViewed = await db.recentlyViewed
      .findMany({
        where: { userId: user.id },
        orderBy: { viewedAt: 'desc' },
        take: 3,
        select: { title: true, href: true, viewedAt: true },
      })
      .catch(() => [])

    // Fetch the user's class + today's timetable + attendance
    if (userDept && userSemester && userDivision) {
      const cls = await db.class.findUnique({
        where: {
          departmentCode_semesterNumber_division: {
            departmentCode: userDept,
            semesterNumber: userSemester,
            division: userDivision,
          },
        },
        include: {
          cr: { select: { id: true, name: true, email: true, rollNumber: true } },
          _count: { select: { members: true } },
        },
      })
      if (cls) {
        classInfo = cls

        // Today's timetable
        const today = new Date().getDay()
        todaySlots = await db.classTimetable
          .findMany({
            where: { classId: cls.id, dayOfWeek: today, isActive: true },
            orderBy: { periodIndex: 'asc' },
            select: { id: true, subjectName: true, startTime: true, endTime: true, room: true, isBreak: true },
          })
          .catch(() => [])

        // Attendance percentage (last 90 days)
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        const sessions = await db.attendanceSession
          .findMany({
            where: {
              departmentCode: userDept,
              semesterNumber: userSemester,
              division: userDivision,
              date: { gte: since },
            },
            select: { id: true },
          })
          .catch(() => [])
        if (sessions.length > 0) {
          const records = await db.attendanceRecord
            .findMany({
              where: { sessionId: { in: sessions.map((s) => s.id) }, userId: user.id },
              select: { status: true },
            })
            .catch(() => [])
          const total = records.length
          const present = records.filter((r) => r.status === 'present' || r.status === 'late').length
          attendancePct = total > 0 ? Math.round((present / total) * 100) : null
        }
      }
    }
  } catch {
    // DB unavailable — use defaults
  }

  const programmeCode = userDept === 'DCIOT' ? 'DCIOT' : 'DCOMP'
  const semesterNumber = userSemester || 3
  const subjects = getManifestSubjectsForSemester(programmeCode, semesterNumber)
  const totalResources = subjects.reduce((sum, s) => sum + s.resources.length, 0)
  const alias = classInfo?.alias?.trim()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-6xl px-5 py-6 sm:px-6 lg:px-8">
        {/* ─── Semester Hero ─── */}
        <section className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5 sm:p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                {programmeCode} / R23 / Semester {semesterNumber}
                {userDivision && ` · Division ${userDivision}`}
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

        {/* ─── My Class + Attendance strip ─── */}
        {classInfo && (
          <section className="mt-5 grid gap-3 sm:grid-cols-2">
            <Link
              href="/class"
              className="block rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/5 to-transparent p-4 transition-all hover:border-amber-500/50 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <ClassAvatar
                  emoji={classInfo.avatarEmoji || undefined}
                  color={classInfo.avatarColor || undefined}
                  division={classInfo.division}
                  semesterNumber={classInfo.semesterNumber}
                  size="md"
                />
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-amber-500">Your Class</p>
                  <h2 className="truncate text-base font-bold">{alias || `Division ${classInfo.division}`}</h2>
                  <p className="text-xs text-muted-foreground">
                    {classInfo._count.members} students
                    {classInfo.cr && ` · CR: ${classInfo.cr.name}`}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
              {todaySlots.length > 0 && (
                <div className="mt-3 flex flex-wrap items-center gap-1.5 border-t border-amber-500/20 pt-2">
                  <Clock className="h-3 w-3 text-muted-foreground" />
                  {todaySlots.slice(0, 3).map((s) => (
                    <span key={s.id} className="inline-flex items-center gap-1 rounded-full bg-background/60 px-2 py-0.5 text-[10px]">
                      <span className="font-mono text-muted-foreground">{s.startTime}</span>
                      <span className="font-medium">{s.isBreak ? 'Break' : (s.subjectName || '—')}</span>
                    </span>
                  ))}
                </div>
              )}
            </Link>

            <Link
              href="/attendance"
              className="block rounded-xl border border-border bg-card p-4 transition-all hover:border-primary/40 hover:shadow-sm"
            >
              <div className="flex items-center gap-3">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
                  <ClipboardList className="h-6 w-6 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-[10px] font-bold uppercase tracking-wide text-primary">Attendance</p>
                  <h2 className="truncate text-base font-bold">
                    {attendancePct !== null ? `${attendancePct}%` : 'View records'}
                  </h2>
                  <p className="text-xs text-muted-foreground">
                    {attendancePct !== null
                      ? attendancePct >= 75 ? 'Good standing' : 'Below 75% — at risk'
                      : 'No sessions yet'}
                  </p>
                </div>
                <ChevronRight className="h-5 w-5 text-muted-foreground shrink-0" />
              </div>
            </Link>
          </section>
        )}

        {/* ─── Continue Where You Left Off ─── */}
        <section className="mt-5">
          <ContinueLearningCard />
        </section>

        {/* ─── Streak Heatmap + Exam Countdown ─── */}
        <section className="mt-5 grid gap-4 lg:grid-cols-2">
          <StreakHeatmap />
          <ExamCountdown examDate={null} />
        </section>

        {/* ─── Quick Actions ─── */}
        <section className="mt-5">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Quick Actions</h2>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
            <Link href="/learn" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
              <BookOpen className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium sm:text-sm">Learn</span>
            </Link>
            <Link href="/class" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-amber-500/40 hover:bg-amber-500/5 sm:p-4">
              <Users className="h-5 w-5 text-amber-500" />
              <span className="text-xs font-medium sm:text-sm">My Class</span>
            </Link>
            <Link href="/attendance" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium sm:text-sm">Attendance</span>
            </Link>
            <Link href="/practice" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
              <Target className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium sm:text-sm">Practice</span>
            </Link>
            <Link href="/tutor" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
              <PlayCircle className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium sm:text-sm">Ask LEO</span>
            </Link>
            <Link href="/materials" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
              <GraduationCap className="h-5 w-5 text-primary" />
              <span className="text-xs font-medium sm:text-sm">Materials</span>
            </Link>
          </div>
        </section>

        {/* ─── My Subjects with Progress Rings ─── */}
        <section className="mt-5">
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
                    <span className="text-[10px] font-semibold uppercase text-muted-foreground">
                      {subjectCode}
                    </span>
                    <ProgressRing value={Math.min(subject.resources.length * 10, 100)} size={36} label="" />
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
      </div>
    </main>
  )
}
