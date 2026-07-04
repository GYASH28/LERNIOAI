import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { TeacherClassesClient } from './teacher-classes-client'

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
    select: { departmentCode: true, name: true },
  })

  const dept = dbUser?.departmentCode || 'DCOMP'

  // Fetch all classes for this department
  let classesBySemester: Record<number, any[]> = {}
  try {
    const classes = await db.class.findMany({
      where: { departmentCode: dept },
      include: {
        cr: { select: { id: true, name: true, email: true, rollNumber: true } },
        _count: { select: { members: true } },
      },
      orderBy: [{ semesterNumber: 'asc' }, { division: 'asc' }],
    })

    for (let s = 1; s <= 6; s++) {
      classesBySemester[s] = classes.filter(c => c.semesterNumber === s).map(c => ({
        id: c.id,
        division: c.division,
        semesterNumber: c.semesterNumber,
        departmentCode: c.departmentCode,
        studentCount: c._count?.members || 0,
        cr: c.cr,
      }))
    }
  } catch (err) {
    console.error('[teacher-dashboard] Failed to fetch classes:', err)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Teacher Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {(dbUser?.name || 'Teacher').split(' ')[0]}! Manage your classes and take attendance.
        </p>

        {/* Quick Actions */}
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <a href="/attendance" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <span className="text-lg">📋</span>
              </div>
              <div>
                <p className="text-sm font-bold">Take Attendance</p>
                <p className="text-xs text-muted-foreground">Mark attendance for any class</p>
              </div>
            </div>
          </a>
          <a href="/class" className="rounded-xl border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
                <span className="text-lg">👥</span>
              </div>
              <div>
                <p className="text-sm font-bold">View Classes</p>
                <p className="text-xs text-muted-foreground">See all classes and students</p>
              </div>
            </div>
          </a>
        </div>

        {/* Classes by Semester */}
        <div className="mt-6">
          <h2 className="text-lg font-bold mb-3">Classes — {dept}</h2>
          <TeacherClassesClient classesBySemester={classesBySemester} />
        </div>
      </div>
    </main>
  )
}
