import Link from 'next/link'
import { redirect } from 'next/navigation'
import { GraduationCap } from 'lucide-react'
import { BackButton } from '@/components/ui/back-button'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { SettingsTabs } from './settings-tabs'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function SettingsPage() {
  const authUser = await getCurrentUser()
  if (!authUser) redirect('/sign-in?callbackUrl=/settings')

  const [user, academicProfile] = await Promise.all([
    db.user.findUnique({ where: { id: authUser.id }, select: { id: true, name: true, email: true, role: true, preferredLang: true, examDate: true, dailyMins: true, avatar: true } }),
    getAcademicProfile(authUser.id),
  ])
  if (!user) redirect('/sign-in?callbackUrl=/settings')
  if (!academicProfile) redirect('/onboarding')

  return (
    <div className="min-h-screen flex flex-col bg-background text-foreground">
      <TopBar />
      <main className="flex-1 bg-background text-foreground">
        <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 lg:px-8">
          <BackButton />
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage your academic setup, account, appearance and privacy.</p>
          <Link href="/settings/academic" className="mt-6 flex items-center justify-between gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-4 transition hover:border-primary/40"><div className="flex items-center gap-3"><div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10"><GraduationCap className="h-5 w-5 text-primary" /></div><div><p className="font-semibold">Academic profile</p><p className="mt-0.5 text-xs text-muted-foreground">{academicProfile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${academicProfile.classLevel}`} · {academicProfile.board} · {academicProfile.stream}</p></div></div><span className="text-sm font-semibold text-primary">Edit</span></Link>
          <div className="mt-6"><SettingsTabs initialUser={user} /></div>
        </div>
      </main>
      <Footer />
    </div>
  )
}
