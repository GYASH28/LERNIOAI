import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { BackButton } from '@/components/ui/back-button'
import { ClassClient } from './class-client'
<<<<<<< HEAD
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
=======
>>>>>>> 335b91df5b081340c259eddbbac5730e692eae74

export const dynamic = 'force-dynamic'

export default async function ClassPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/class')

  return (
<<<<<<< HEAD
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
=======
    <main className="min-h-screen bg-background text-foreground">
>>>>>>> 335b91df5b081340c259eddbbac5730e692eae74
      <div className="mx-auto max-w-5xl px-5 py-6 sm:px-6 lg:px-8">
        <BackButton />
        <h1 className="text-2xl font-bold">My Class</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your classmates, CR, announcements, and weekly timetable — all in one place.
        </p>
        <div className="mt-6">
          <ClassClient userRole={user.role} userId={user.id} />
        </div>
      </div>
    </main>
<<<<<<< HEAD
      <Footer />
    </div>
=======
>>>>>>> 335b91df5b081340c259eddbbac5730e692eae74
  )
}
