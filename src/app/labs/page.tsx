import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { LabsView } from '@/components/views/labs'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function LabsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/labs')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 min-w-0 flex flex-col">
        <div className="flex-1">
          <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 lg:px-8">
            <LabsView />
          </div>
        </div>
        <Footer />
      </main>
    </div>
  )
}
