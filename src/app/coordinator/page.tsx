import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { Users, BookOpen, TrendingUp, Calendar, ClipboardList, Shield } from 'lucide-react'
import Link from 'next/link'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function CoordinatorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/coordinator')
  if (user.role !== 'cr' && user.role !== 'admin') redirect('/dashboard')

  let studentCount = 0
  let totalXp = 0
  let activeSessions = 0
  let announcements = 0
  try {
    const students = await db.user.findMany({
      where: { role: 'student', status: 'active' },
      select: { xp: true },
    })
    studentCount = students.length
    totalXp = students.reduce((s, u) => s + u.xp, 0)
    activeSessions = await db.attendanceSession.count({
      where: { date: { gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) } },
    }).catch(() => 0)
    announcements = await db.classAnnouncement.count().catch(() => 0)
  } catch {}

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <h1 className="text-2xl font-bold mb-1 flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Coordinator Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mb-6">Manage your class, take attendance, post announcements</p>

          {/* Stats */}
          <div className="grid gap-4 sm:grid-cols-4 mb-6">
            <div className="rounded-lg border border-border bg-card p-4">
              <Users className="h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-bold">{studentCount}</p>
              <p className="text-xs text-muted-foreground">Students</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <TrendingUp className="h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-bold">{totalXp}</p>
              <p className="text-xs text-muted-foreground">Total XP</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <Calendar className="h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-bold">{activeSessions}</p>
              <p className="text-xs text-muted-foreground">Attendance (7d)</p>
            </div>
            <div className="rounded-lg border border-border bg-card p-4">
              <ClipboardList className="h-5 w-5 text-primary" />
              <p className="mt-2 text-2xl font-bold">{announcements}</p>
              <p className="text-xs text-muted-foreground">Announcements</p>
            </div>
          </div>

          {/* Quick actions */}
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            <Link href="/cr" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Calendar className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">Take Attendance</p><p className="text-xs text-muted-foreground">Mark today&apos;s attendance</p></div>
            </Link>
            <Link href="/cr" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><ClipboardList className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">Post Announcement</p><p className="text-xs text-muted-foreground">Notify your class</p></div>
            </Link>
            <Link href="/class" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">View Class</p><p className="text-xs text-muted-foreground">See classmates & timetable</p></div>
            </Link>
            <Link href="/attendance" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><BookOpen className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">Attendance Records</p><p className="text-xs text-muted-foreground">View attendance history</p></div>
            </Link>
            <Link href="/dashboard" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><TrendingUp className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">Student Dashboard</p><p className="text-xs text-muted-foreground">Your own learning</p></div>
            </Link>
            <Link href="/community" className="flex items-center gap-3 rounded-lg border border-border bg-card p-4 hover:border-primary/40 hover:bg-accent/5 transition-colors">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10"><Users className="h-5 w-5 text-primary" /></div>
              <div><p className="text-sm font-semibold">Community</p><p className="text-xs text-muted-foreground">Q&A and discussions</p></div>
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
