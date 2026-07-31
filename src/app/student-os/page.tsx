import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { StudentOSClient } from '@/components/student-os/student-os-client'

export const dynamic = 'force-dynamic'

export default async function StudentOSPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/student-os')

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      name: true,
      departmentCode: true,
      semesterNumber: true,
      dailyMins: true,
      xp: true,
      streak: true,
    },
  }).catch(() => null)

  const programme = profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="page-wipe">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <StudentOSClient
            userName={profile?.name || user.name}
            programme={programme}
            semester={profile?.semesterNumber || 3}
            dailyMinutes={profile?.dailyMins || 90}
            xp={profile?.xp || 0}
            streak={profile?.streak || 0}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
