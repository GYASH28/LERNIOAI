import { redirect } from 'next/navigation'
import { Brain, Sparkles } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { TutorAcademicClient } from './tutor-academic-client'

export const dynamic = 'force-dynamic'

export default async function TutorPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/tutor')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-7 sm:px-6 lg:px-8">
        <header className="mb-5 rounded-3xl border border-border bg-card p-5 sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><Brain className="h-4 w-4" /> AI Tutor</div>
              <h1 className="mt-2 text-2xl font-bold sm:text-3xl">Learn with context, not canned answers.</h1>
              <p className="mt-2 text-sm text-muted-foreground">{profile.board} · {profile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${profile.classLevel}`} · {profile.stream} · {profile.targetExams.map((exam) => exam.replaceAll('_', ' ')).join(' + ')}</p>
            </div>
            <div className="inline-flex items-center gap-2 rounded-xl bg-primary/10 px-3 py-2 text-xs font-semibold text-primary"><Sparkles className="h-4 w-4" /> Academic profile active</div>
          </div>
        </header>
        <TutorAcademicClient />
      </main>
      <Footer />
    </div>
  )
}
