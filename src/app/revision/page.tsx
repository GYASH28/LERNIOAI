import { redirect } from 'next/navigation'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { getCurrentUser } from '@/lib/auth'
import { RouteViewPage } from '@/components/app/route-view-page'

export const dynamic = 'force-dynamic'

export default async function RevisionPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision')

  // Use RouteViewPage which renders the premium RevisionView with FlashcardPlayer
  // (server-backed SM-2 spaced repetition, 3D flip, XP awards, achievements)
  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <RouteViewPage view="revision" />
      </main>
      <Footer />
    </div>
  )
}
