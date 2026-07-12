import { redirect } from 'next/navigation'
import { BackButton } from "@/components/ui/back-button"
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { SettingsTabs } from './settings-tabs'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

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
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 page-wipe bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and privacy.
        </p>
        <div className="mt-6">
          <SettingsTabs initialUser={user} />
        </div>
      </div>
    </main>
      <Footer />
    </div>
  )
}
