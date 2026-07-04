import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { ProfileClient } from './profile-client'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/profile')

  // Fetch full user data + class info + attendance
  let dbUser: any = null
  let classInfo: any = null
  let attendancePct: number | null = null
  let totalSessions = 0

  try {
    dbUser = await db.user.findUnique({
      where: { id: user.id },
      select: {
        id: true, name: true, email: true, role: true, rollNumber: true, phone: true,
        departmentCode: true, departmentName: true, semesterNumber: true, division: true,
        xp: true, streak: true, level: true, avatar: true, photoUrl: true,
        examDate: true, dailyMins: true, preferredLang: true, createdAt: true,
        showPhoneToClassmates: true, showEmailToClassmates: true,
      },
    })

    if (!dbUser) redirect('/sign-in?callbackUrl=/profile')

    // Fetch class info
    if (dbUser.departmentCode && dbUser.semesterNumber && dbUser.division) {
      const cls = await db.class.findUnique({
        where: {
          departmentCode_semesterNumber_division: {
            departmentCode: dbUser.departmentCode,
            semesterNumber: dbUser.semesterNumber,
            division: dbUser.division,
          },
        },
        include: {
          cr: { select: { id: true, name: true, email: true } },
          _count: { select: { members: true } },
        },
      })
      if (cls) {
        classInfo = cls

        // Attendance calculation (last 90 days)
        const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000)
        const sessions = await db.attendanceSession.findMany({
          where: {
            departmentCode: dbUser.departmentCode,
            semesterNumber: dbUser.semesterNumber,
            division: dbUser.division,
            date: { gte: since },
          },
          select: { id: true },
        })
        totalSessions = sessions.length
        if (sessions.length > 0) {
          const records = await db.attendanceRecord.findMany({
            where: { sessionId: { in: sessions.map(s => s.id) }, userId: user.id },
            select: { status: true },
          })
          const total = records.length
          const present = records.filter(r => r.status === 'present' || r.status === 'late').length
          attendancePct = total > 0 ? Math.round((present / total) * 100) : null
        }
      }
    }
  } catch (err) {
    console.error('[profile] Error fetching data:', err)
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">Profile</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, class info, and learning preferences.
        </p>
        <div className="mt-6">
          <ProfileClient
            userRole={user.role}
            userId={user.id}
            initialUser={dbUser}
            classInfo={classInfo}
            attendancePct={attendancePct}
            totalSessions={totalSessions}
          />
        </div>
      </div>
    </main>
  )
}
