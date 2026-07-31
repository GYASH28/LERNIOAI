import { redirect } from 'next/navigation'
import { requireActiveRole } from '@/lib/auth'
import { db } from '@/lib/db'
import Link from 'next/link'
import {
  Users, BookOpen, FileText, Database, Shield, Settings,
  ClipboardList, Megaphone, BarChart3, Download, AlertTriangle,
} from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'

export const dynamic = 'force-dynamic'

export const metadata = { title: 'Admin Dashboard' }

export default async function AdminPage() {
  // Use requireActiveRole (DB-backed) instead of getCurrentUser (JWT-only)
  // This fixes the "admin redirected to student dashboard" bug when JWT is stale
  let authority
  try {
    authority = await requireActiveRole('admin')
  } catch {
    redirect('/sign-in?callbackUrl=/admin')
  }
  const user = authority.user

  // Fetch quick stats — all wrapped in try/catch for resilience
  let stats = {
    totalUsers: 0,
    students: 0,
    teachers: 0,
    subjects: 0,
    attendanceSessions: 0,
  }

  try {
    const [totalUsers, students, teachers, subjects, attendanceSessions] = await Promise.all([
      db.user.count().catch(() => 0),
      db.user.count({ where: { role: 'student' } }).catch(() => 0),
      db.user.count({ where: { role: 'teacher' } }).catch(() => 0),
      db.subject.count().catch(() => 0),
      db.attendanceSession.count().catch(() => 0),
    ])
    stats = { totalUsers, students, teachers, subjects, attendanceSessions }
  } catch (err) {
    console.error('[admin] Stats fetch failed:', err)
  }

  const firstName = (user.name || 'Admin').split(' ')[0]

  const actions = [
    { label: 'Manage Users', detail: 'View all users and their roles', href: '/admin/users', icon: Users },
    { label: 'Take Attendance', detail: 'Mark attendance for any class', href: '/attendance', icon: ClipboardList },
    { label: 'Academic Setup', detail: 'Departments, programmes, classes', href: '/admin/departments', icon: BookOpen },
    { label: 'Learning Coverage', detail: 'Curriculum and resource gaps', href: '/admin/learning/coverage', icon: Database },
    { label: 'Lesson Notes', detail: 'Preview generated notes', href: '/admin/learning/notes', icon: FileText },
    { label: 'Analytics', detail: 'Platform-wide statistics', href: '/analytics', icon: BarChart3 },
    { label: 'Announcements', detail: 'Send notices to students/staff', href: '/admin/announcements', icon: Megaphone },
    { label: 'Site Settings', detail: 'Configuration and flags', href: '/settings', icon: Settings },
  ]

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <BackButton />

        {/* Hero */}
        <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-6 mb-6">
          <div className="flex items-center gap-2 mb-1">
            <Shield className="h-5 w-5 text-primary" />
            <p className="text-sm font-bold text-primary">Admin Dashboard</p>
          </div>
          <h1 className="text-2xl font-black tracking-tight sm:text-3xl">Welcome, {firstName}</h1>
          <p className="mt-2 text-sm text-muted-foreground">Manage users, attendance, curriculum, and platform settings.</p>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5 mb-6">
          <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="text-cyan-500" />
          <StatCard icon={Users} label="Students" value={stats.students} color="text-violet-500" />
          <StatCard icon={Shield} label="Teachers" value={stats.teachers} color="text-amber-500" />
          <StatCard icon={BookOpen} label="Subjects" value={stats.subjects} color="text-green-500" />
          <StatCard icon={ClipboardList} label="Sessions" value={stats.attendanceSessions} color="text-pink-500" />
        </div>

        {/* Quick Actions */}
        <h2 className="text-lg font-bold mb-3">Quick Actions</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {actions.map((action) => {
            const Icon = action.icon
            return (
              <Link
                key={action.href}
                href={action.href}
                className="group rounded-xl border border-border bg-card p-5 transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 transition-colors group-hover:bg-primary/20">
                    <Icon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h3 className="text-sm font-bold">{action.label}</h3>
                    <p className="mt-1 text-xs text-muted-foreground">{action.detail}</p>
                  </div>
                </div>
              </Link>
            )
          })}
        </div>

        {/* Recent Users */}
        <h2 className="text-lg font-bold mt-8 mb-3">Recent Users</h2>
        <RecentUsers />
      </div>
    </main>
  )
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}

async function RecentUsers() {
  let users: Array<{ id: string; name: string | null; email: string; role: string; status: string; createdAt: Date }> = []
  let loadError = false
  try {
    users = await db.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 5,
      select: { id: true, name: true, email: true, role: true, status: true, createdAt: true },
    })
  } catch {
    loadError = true
  }

  if (loadError) {
    return <p className="text-sm text-muted-foreground py-4">Unable to load recent users.</p>
  }

  if (users.length === 0) {
    return <p className="text-sm text-muted-foreground py-4">No users registered yet.</p>
  }

  return (
    <div className="space-y-2">
      {users.map(u => (
        <div key={u.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
            {(u.name || '?').charAt(0).toUpperCase()}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-medium truncate">{u.name}</p>
            <p className="text-xs text-muted-foreground truncate">{u.email}</p>
          </div>
          <span className={`text-xs font-bold rounded px-2 py-0.5 ${
            u.role === 'admin' ? 'bg-red-500/10 text-red-500' :
            u.role === 'teacher' ? 'bg-amber-500/10 text-amber-500' :
            u.role === 'cr' ? 'bg-violet-500/10 text-violet-500' :
            'bg-cyan-500/10 text-cyan-500'
          }`}>{u.role}</span>
          <span className="text-xs text-muted-foreground">
            {u.createdAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
          </span>
        </div>
      ))}
    </div>
  )
}
