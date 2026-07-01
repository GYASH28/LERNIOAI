import { redirect } from 'next/navigation'
import { getCurrentUser } from '@/lib/auth'
import { SettingsTabs } from './settings-tabs'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/settings')

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
        <h1 className="text-2xl font-bold">Settings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage your account, preferences, and privacy.
        </p>
        <div className="mt-6">
          <SettingsTabs initialUser={{
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            preferredLang: user.preferredLang,
            examDate: user.examDate,
            dailyMins: user.dailyMins,
            avatar: user.avatar ?? null,
          }} />
        </div>
      </div>
    </main>
  )
}
