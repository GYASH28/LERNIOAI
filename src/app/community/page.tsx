import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { CommunityClient } from './community-client'

export const dynamic = 'force-dynamic'

export default async function CommunityPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/community')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <CommunityClient />
        </div>
      </main>
      <Footer />
    </div>
  )
}
