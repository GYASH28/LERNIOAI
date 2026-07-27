import { redirect } from 'next/navigation'
import { getCurrentUser, requireRole } from '@/lib/auth'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { ModeratorClient } from './moderator-client'
import { db } from '@/lib/db'

export const dynamic = 'force-dynamic'

export default async function ModeratorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/moderator')
  if (user.role !== 'moderator' && user.role !== 'admin') redirect('/dashboard')

  // Fetch flagged/reported content
  let reportedPosts: any[] = []
  let flaggedPosts: any[] = []
  try {
    reportedPosts = await db.communityPost.findMany({
      where: { status: 'hidden', reports: { gt: 0 } },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { reports: 'desc' },
      take: 50,
    })
    flaggedPosts = await db.communityPost.findMany({
      where: { aiFlagged: true, status: 'published' },
      include: { author: { select: { name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    })
  } catch {}

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe">
        <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
          <ModeratorClient reportedPosts={reportedPosts} flaggedPosts={flaggedPosts} />
        </div>
      </main>
      <Footer />
    </div>
  )
}
