import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { BackButton } from '@/components/ui/back-button'
import { ClassClient } from './class-client'

export const dynamic = 'force-dynamic'

export default async function ClassPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/class')

  return (
    <main className="min-h-screen bg-background text-foreground">
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
  )
}
