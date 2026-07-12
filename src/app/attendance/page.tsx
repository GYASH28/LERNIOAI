import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { AttendanceClient } from './attendance-client'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function AttendancePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/attendance')

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: { role: true, departmentCode: true, semesterNumber: true, division: true, name: true },
  })

  if (!dbUser) redirect('/sign-in?callbackUrl=/attendance')

  // CR, teacher, admin can take attendance
  const canTakeAttendance = ['cr', 'teacher', 'admin'].includes(dbUser.role)

  // Students view their own attendance
  const isStudent = dbUser.role === 'student'

  if (!canTakeAttendance && !isStudent) {
    redirect('/dashboard')
  }

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canTakeAttendance
            ? `Take and manage attendance for ${dbUser.departmentCode || 'DCOMP'} · Sem ${dbUser.semesterNumber || 3} · Div ${dbUser.division || 'A'}`
            : 'View your attendance records'}
        </p>

        {/* Class info strip */}
        {dbUser.departmentCode && dbUser.semesterNumber && dbUser.division && (
          <div className="mt-4 flex items-center gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs">
            <span className="font-semibold text-amber-500">Your class:</span>
            <span className="text-muted-foreground">
              {dbUser.departmentCode} · Semester {dbUser.semesterNumber} · Division {dbUser.division}
            </span>
            <a href="/class" className="ml-auto text-primary hover:underline">View class →</a>
          </div>
        )}

        {/* Profile completion prompt */}
        {(!dbUser.departmentCode || !dbUser.semesterNumber || !dbUser.division) && (
          <div className="mt-4 rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <p className="font-semibold text-amber-600">Complete your profile</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              You need to set your department, semester, and division to use attendance.
            </p>
            <a href="/profile" className="mt-1 inline-block text-xs font-semibold text-primary hover:underline">
              Set up now →
            </a>
          </div>
        )}

        <div className="mt-6">
          <AttendanceClient
            canTakeAttendance={canTakeAttendance}
            userClass={{
              departmentCode: dbUser.departmentCode || 'DCOMP',
              semesterNumber: dbUser.semesterNumber || 3,
              division: dbUser.division || 'A',
            }}
          />
        </div>
      </div>
    </main>
      <Footer />
    </div>
  )
}
