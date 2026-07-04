import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { TeacherClassesClient } from './teacher-classes-client'
import { ClipboardList, Users, GraduationCap, BookOpen } from 'lucide-react'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TeacherDashboardPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/teacher-dashboard')
  if (user.role !== 'teacher' && user.role !== 'admin' && user.role !== 'coordinator') {
    redirect('/dashboard')
  }

  // Get teacher's department
  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { departmentCode: true, name: true, role: true },
  })

  const dept = dbUser?.departmentCode || 'DCOMP'

  // Fetch all classes for this department
  let classesBySemester: Record<number, any[]> = {}
  let totalStudents = 0
  let totalClasses = 0
  try {
    const classes = await db.class.findMany({
      where: { departmentCode: dept },
      include: {
        cr: { select: { id: true, name: true, email: true, rollNumber: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ semesterNumber: 'asc' }, { division: 'asc' }],
    })

    totalClasses = classes.length
    totalStudents = classes.reduce((sum, c) => sum + (c._count?.members || 0), 0)

    for (let s = 1; s <= 6; s++) {
      classesBySemester[s] = classes.filter(c => c.semesterNumber === s).map(c => ({
        id: c.id,
        division: c.division,
        semesterNumber: c.semesterNumber,
        departmentCode: c.departmentCode,
        academicYear: c.academicYear,
        alias: c.alias,
        avatarEmoji: c.avatarEmoji,
        avatarColor: c.avatarColor,
        studentCount: c._count?.members || 0,
        cr: c.cr,
      }))
    }
  } catch (err) {
    console.error('[teacher-dashboard] Failed to fetch classes:', err)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {(dbUser?.name || 'Teacher').split(' ')[0]}! Manage your classes, take attendance, and view students.
        </p>

        {/* Stats */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-3">
          <div className="rounded-lg border border-border bg-card p-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <p className="mt-2 text-2xl font-bold">{totalClasses}</p>
            <p className="text-xs text-muted-foreground">Classes in {dept}</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <Users className="h-5 w-5 text-primary" />
            <p className="mt-2 text-2xl font-bold">{totalStudents}</p>
            <p className="text-xs text-muted-foreground">Total students</p>
          </div>
          <div className="rounded-lg border border-border bg-card p-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-2 text-2xl font-bold">48</p>
            <p className="text-xs text-muted-foreground">Subjects available</p>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Link href="/attendance" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Take Attendance</p>
                <p className="text-xs text-muted-foreground">Manual · QR · Self-check</p>
              </div>
            </div>
          </Link>
          <Link href="/class" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <Users className="h-5 w-5 text-violet-500" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">View Classes</p>
                <p className="text-xs text-muted-foreground">See all classes & students</p>
              </div>
            </div>
          </Link>
          <Link href="/learn" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
                <BookOpen className="h-5 w-5 text-emerald-600" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Browse Lessons</p>
                <p className="text-xs text-muted-foreground">Curriculum content</p>
              </div>
            </div>
          </Link>
          <Link href="/analytics" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-amber-500/10">
                <span className="text-lg">📊</span>
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold">Analytics</p>
                <p className="text-xs text-muted-foreground">Platform statistics</p>
              </div>
            </div>
          </Link>
        </div>

        {/* Classes by Semester */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">Classes — {dept}</h2>
          {totalClasses === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">No classes created yet</p>
              <p className="text-xs text-muted-foreground">
                Classes are auto-created when students sign up with their department, semester, and division.
                Once students join, their classes will appear here.
              </p>
            </div>
          ) : (
            <TeacherClassesClient classesBySemester={classesBySemester} />
          )}
        </div>
      </div>
    </main>
  )
}
