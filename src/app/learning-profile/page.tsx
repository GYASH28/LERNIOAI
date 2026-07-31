import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { LearningProfileClient } from '@/components/student-os/learning-profile-client'

export const dynamic = 'force-dynamic'

export default async function LearningProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/learning-profile')

  const profile = await db.user.findUnique({
    where: { id: user.id },
    select: {
      departmentCode: true,
      semesterNumber: true,
      dailyMins: true,
      preferredLang: true,
    },
  }).catch(() => null)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="page-wipe">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <LearningProfileClient
            programme={profile?.departmentCode === 'DCIOT' ? 'DCIOT' : 'DCOMP'}
            semester={profile?.semesterNumber || 3}
            dailyMinutes={profile?.dailyMins || 90}
            preferredLanguage={profile?.preferredLang || 'en'}
          />
        </div>
      </main>
      <Footer />
    </div>
  )
}
