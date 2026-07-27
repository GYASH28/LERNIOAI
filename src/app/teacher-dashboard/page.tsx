import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { Users, BookOpen, TrendingUp, AlertCircle } from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/teacher-dashboard')
  if (user.role !== 'teacher' && user.role !== 'admin') redirect('/dashboard')

  let studentCount = 0, totalLessons = 0, totalXp = 0, lowPerformers: { name: string; xp: number; streak: number }[] = []
  try {
    studentCount = await db.user.count({ where: { role: 'student', status: 'active' } })
    const students = await db.user.findMany({ where: { role: 'student', status: 'active' }, select: { name: true, xp: true, streak: true }, orderBy: { xp: 'asc' }, take: 5 })
    totalXp = students.reduce((s, u) => s + u.xp, 0)
    lowPerformers = students.map(s => ({ name: s.name, xp: s.xp, streak: s.streak }))
  } catch {}

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold mb-1">Teacher Dashboard</h1>
        <p className="text-sm text-muted-foreground mb-6">Overview of student progress and engagement</p>
        <div className="grid gap-4 sm:grid-cols-3 mb-6">
          <div className="rounded-lg border border-border bg-card p-4"><Users className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-bold">{studentCount}</p><p className="text-xs text-muted-foreground">Active Students</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><TrendingUp className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-bold">{totalXp}</p><p className="text-xs text-muted-foreground">Total XP Earned</p></div>
          <div className="rounded-lg border border-border bg-card p-4"><BookOpen className="h-5 w-5 text-primary" /><p className="mt-2 text-2xl font-bold">48</p><p className="text-xs text-muted-foreground">Subjects Available</p></div>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <div className="mb-3 flex items-center gap-2"><AlertCircle className="h-5 w-5 text-orange-500" /><h2 className="text-sm font-semibold">Students Needing Attention</h2></div>
          {lowPerformers.length > 0 ? (
            <div className="space-y-2">{lowPerformers.map((s, i) => (
              <div key={i} className="flex items-center justify-between rounded-md border border-border/50 p-3">
                <span className="text-sm font-medium">{s.name}</span>
                <div className="flex gap-3 text-xs"><span className="text-amber-600">⚡ {s.xp} XP</span><span className="text-orange-600">🔥 {s.streak} days</span></div>
              </div>
            ))}</div>
          ) : <p className="text-sm text-muted-foreground">No student data available.</p>}
        </div>
      </div>
      </main>
      <Footer />
    </div>
  )
}
