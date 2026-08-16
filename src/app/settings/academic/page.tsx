import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { AcademicSettingsForm } from './academic-form'

export const dynamic = 'force-dynamic'

export default async function AcademicSettingsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/settings/academic')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-3xl px-5 py-8 sm:px-6">
        <Link href="/settings" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Settings</Link>
        <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Academic profile</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Change what Lernio is built around.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Update class, stream, exam targets and study goal without changing your account, theme or authentication. Existing activity is preserved; irrelevant academic tools stop appearing after the profile changes.</p></header>
        <div className="mt-7"><AcademicSettingsForm profile={{ board: profile.board, classLevel: profile.classLevel, stream: profile.stream, targetExams: profile.targetExams, targetYear: profile.targetYear, dailyStudyGoal: profile.dailyStudyGoal, weakSubjects: profile.weakSubjects }} /></div>
      </main>
      <Footer />
    </div>
  )
}
