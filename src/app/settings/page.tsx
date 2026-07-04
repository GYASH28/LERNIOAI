import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SettingsTabs } from './settings-tabs'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const authUser = await getCurrentUser()
  if (!authUser) redirect('/sign-in?callbackUrl=/settings')

  // Fetch the full user record to access fields not on AuthUser
  const user = await db.user.findUnique({
    where: { id: authUser.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      preferredLang: true,
      examDate: true,
      dailyMins: true,
      avatar: true,
    },
  })

  if (!user) redirect('/sign-in?callbackUrl=/settings')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-5 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and privacy.
        </p>
        <div className="mt-6">
          <SettingsTabs initialUser={user} />
        </div>
      </div>
    </main>
  )
}
