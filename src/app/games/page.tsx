import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { GamesClient } from '@/components/student-os/games-client'
import { ChallengeArcadeClient } from '@/components/student-os/challenge-arcade-client'

export const dynamic = 'force-dynamic'

export default async function GamesPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/games')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="page-wipe">
        <div className="mx-auto max-w-7xl px-4 py-5 sm:px-6 sm:py-7 lg:px-8">
          <GamesClient />
          <div className="mt-6">
            <ChallengeArcadeClient />
          </div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
