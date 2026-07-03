import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { AttendanceClient } from './attendance-client'

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
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl px-4 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Attendance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {canTakeAttendance
            ? `Take and manage attendance for ${dbUser.departmentCode || 'DCOMP'} · Sem ${dbUser.semesterNumber || 3} · Div ${dbUser.division || 'A'}`
            : 'View your attendance records'}
        </p>
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
  )
}
