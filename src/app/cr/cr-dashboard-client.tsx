'use client'

import { useState, useEffect } from 'react'
import {
  ClipboardList, Megaphone, Users, AlertTriangle, MessageSquare,
  Clock, Crown, Loader2, BookOpen, PlayCircle, Target, GraduationCap,
  Database, RotateCw, BarChart3,
} from 'lucide-react'
import Link from 'next/link'

interface ClassInfo {
  id: string
  alias: string | null
  avatarEmoji: string | null
  avatarColor: string | null
}

interface CrDashboardClientProps {
  userRole: string
  userId: string
  classInfo: ClassInfo | null
  userClass: { departmentCode: string; semesterNumber: number; division: string }
}

type Tab = 'home' | 'at-risk' | 'messages'

export function CrDashboardClient({ userRole, userId, classInfo, userClass }: CrDashboardClientProps) {
  const [tab, setTab] = useState<Tab>('home')
  const [stats, setStats] = useState<{
    totalSessions: number
    avgAttendance: number
    totalPresent: number
    totalAbsent: number
    recentSessions: any[]
  } | null>(null)
  const [announcementsCount, setAnnouncementsCount] = useState(0)
  const [membersCount, setMembersCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    Promise.all([
      fetch('/api/attendance?action=stats').then((r) => r.json()),
      fetch(`/api/class/announcements?classId=${classInfo?.id || ''}`).then((r) => r.json()),
      fetch(`/api/class?action=my-class`).then((r) => r.json()),
    ])
      .then(([s, a, c]) => {
        if (s.ok) setStats(s.data)
        if (a.ok) setAnnouncementsCount(a.data?.length || 0)
        if (c.ok) setMembersCount(c.data?.members?.length || 0)
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [classInfo?.id])

  return (
    <div className="space-y-5">
      {/* Class identity strip */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-4">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
            <Crown className="h-5 w-5 text-amber-500" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-base font-bold">
              {classInfo?.alias || `Division ${userClass.division}`}
            </h2>
            <p className="text-xs text-muted-foreground">
              {userClass.departmentCode} · Semester {userClass.semesterNumber} · Division {userClass.division}
            </p>
          </div>
          <Link
            href="/class"
            className="rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/50"
          >
            Open class page →
          </Link>
        </div>
      </div>

      {/* Tab switcher */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'home' as Tab, label: 'Home', icon: ClipboardList },
          { id: 'at-risk' as Tab, label: 'At-risk students', icon: AlertTriangle },
          { id: 'messages' as Tab, label: 'Messages', icon: MessageSquare },
        ].map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" /> {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
            </button>
          )
        })}
      </div>

      {tab === 'home' && (
        <>
          {/* CR Quick Actions */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <QuickAction href="/attendance" icon={ClipboardList} label="Take Attendance" sub="Manual · QR · Self-check" color="bg-primary/10 text-primary" />
            <QuickAction href="/class" icon={Megaphone} label="Post Announcement" sub={`${announcementsCount} active`} color="bg-amber-500/10 text-amber-500" />
            <QuickAction href="/class" icon={Users} label="Class Directory" sub={`${membersCount} students`} color="bg-emerald-500/10 text-emerald-600" />
          </div>

          {/* Student Quick Actions — CR can use all student features too */}
          <div>
            <h3 className="mb-2 text-xs font-bold uppercase text-muted-foreground">Student Features</h3>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
              <Link href="/learn" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <BookOpen className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Learn</span>
              </Link>
              <Link href="/practice" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <Target className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Practice</span>
              </Link>
              <Link href="/tutor" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <PlayCircle className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Ask LEO</span>
              </Link>
              <Link href="/exams" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <GraduationCap className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Exams</span>
              </Link>
              <Link href="/revision" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <RotateCw className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Revision</span>
              </Link>
              <Link href="/materials" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Materials</span>
              </Link>
              <Link href="/coding" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <PlayCircle className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Coding Lab</span>
              </Link>
              <Link href="/labs" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <Database className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Labs</span>
              </Link>
              <Link href="/planner" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <Clock className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Planner</span>
              </Link>
              <Link href="/analytics" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <BarChart3 className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Analytics</span>
              </Link>
              <Link href="/profile" className="flex flex-col items-center gap-1.5 rounded-lg border border-border bg-card p-3 text-center transition-colors hover:border-primary/40 hover:bg-accent/5 sm:p-4">
                <Users className="h-5 w-5 text-primary" />
                <span className="text-xs font-medium sm:text-sm">Profile</span>
              </Link>
            </div>
          </div>

          {/* Attendance stats */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold">Attendance overview</h3>
              <Link href="/attendance" className="text-xs text-primary hover:underline">View all →</Link>
            </div>
            {loading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-5 w-5 animate-spin text-primary" />
              </div>
            ) : stats ? (
              <>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  <Stat label="Sessions" value={stats.totalSessions} />
                  <Stat label="Avg attendance" value={`${stats.avgAttendance}%`} highlight={stats.avgAttendance < 75 ? 'low' : 'good'} />
                  <Stat label="Total present" value={stats.totalPresent} />
                </div>
                {stats.recentSessions && stats.recentSessions.length > 0 && (
                  <div className="space-y-1.5">
                    <p className="text-[10px] uppercase text-muted-foreground">Recent sessions</p>
                    {stats.recentSessions.slice(0, 5).map((s: any) => (
                      <div key={s.id} className="flex items-center gap-3 rounded-md border border-border bg-background px-2.5 py-1.5">
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-xs font-medium">{s.subjectName || 'General'}</p>
                          <p className="text-[10px] text-muted-foreground">
                            {new Date(s.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                          </p>
                        </div>
                        <span className="text-xs">
                          <span className="text-green-500 font-bold">{s.presentCount}</span>
                          <span className="text-muted-foreground">/{s.totalStudents}</span>
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <p className="text-xs text-muted-foreground">No attendance data yet.</p>
            )}
          </div>
        </>
      )}

      {tab === 'at-risk' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <AlertTriangle className="h-4 w-4 text-red-500" /> At-risk students
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Students with attendance below 75% will appear here once attendance sessions are recorded.
          </p>
          <Link href="/attendance" className="mt-3 inline-block rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90">
            Take attendance →
          </Link>
        </div>
      )}

      {tab === 'messages' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <MessageSquare className="h-4 w-4 text-primary" /> Messages
          </h3>
          <p className="mt-2 text-xs text-muted-foreground">
            Message the admin directly for escalations, academic concerns, or scheduling issues.
          </p>
          <p className="mt-3 text-xs text-muted-foreground">Direct messaging with admin is not yet available. Use the Feedback page to reach the team.</p>
        </div>
      )}
    </div>
  )
}

function QuickAction({
  href,
  icon: Icon,
  label,
  sub,
  color,
}: {
  href: string
  icon: any
  label: string
  sub: string
  color: string
}) {
  return (
    <Link
      href={href}
      className="rounded-xl border border-border bg-card p-3 transition-all hover:border-primary/40 hover:bg-accent/5"
    >
      <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-2 text-sm font-semibold">{label}</p>
      <p className="text-[10px] text-muted-foreground">{sub}</p>
    </Link>
  )
}

function Stat({ label, value, highlight }: { label: string; value: string | number; highlight?: 'low' | 'good' }) {
  const color = highlight === 'low' ? 'text-red-500' : highlight === 'good' ? 'text-emerald-600' : 'text-foreground'
  return (
    <div className="rounded-md border border-border bg-background p-2.5">
      <p className="text-[10px] uppercase text-muted-foreground">{label}</p>
      <p className={`text-base font-bold ${color}`}>{value}</p>
    </div>
  )
}
