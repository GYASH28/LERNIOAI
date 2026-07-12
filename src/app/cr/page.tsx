import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'

import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { BackButton } from '@/components/ui/back-button'
import { CrDashboardClient } from './cr-dashboard-client'

export const metadata: Metadata = { title: 'CR Dashboard' }

export default async function CrPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/cr')
  if (user.role !== 'cr' && user.role !== 'admin') redirect('/dashboard')

  const dbUser = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      role: true,
      departmentCode: true,
      semesterNumber: true,
      division: true,
    },
  })

  if (!dbUser) redirect('/sign-in?callbackUrl=/cr')

  // Find CR's class
  let classInfo: { id: string; alias: string | null; avatarEmoji: string | null; avatarColor: string | null } | null = null
  if (dbUser.departmentCode && dbUser.semesterNumber && dbUser.division) {
    const cls = await db.class.findUnique({
      where: {
        departmentCode_semesterNumber_division: {
          departmentCode: dbUser.departmentCode,
          semesterNumber: dbUser.semesterNumber,
          division: dbUser.division,
        },
      },
      select: { id: true, alias: true, avatarEmoji: true, avatarColor: true },
    })
    classInfo = cls
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">CR Dashboard</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Welcome, {(dbUser.name || 'CR').split(' ')[0]}! Take attendance, post announcements, and manage your class — plus all your student features.
        </p>
        <div className="mt-6">
          <CrDashboardClient
            userRole={dbUser.role}
            userId={user.id}
            classInfo={classInfo}
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
