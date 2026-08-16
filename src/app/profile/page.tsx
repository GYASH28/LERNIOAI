import Link from 'next/link'
import { redirect } from 'next/navigation'
import { BookOpen, CalendarClock, GraduationCap, Settings, Target, UserRound } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function ProfilePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/profile')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-border bg-card p-6 sm:p-8">
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-3xl bg-primary/10 text-2xl font-bold text-primary">{user.name.charAt(0).toUpperCase()}</div>
            <div className="min-w-0 flex-1"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Student profile</p><h1 className="mt-1 truncate text-3xl font-bold tracking-tight">{user.name}</h1><p className="mt-1 truncate text-sm text-muted-foreground">{user.email}</p></div>
            <Link href="/settings" className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent"><Settings className="h-4 w-4" /> Settings</Link>
          </div>
        </section>

        <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-border bg-card p-5"><GraduationCap className="h-5 w-5 text-primary" /><p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Class</p><p className="mt-1 text-lg font-semibold">{profile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${profile.classLevel}`}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><BookOpen className="h-5 w-5 text-primary" /><p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Board / Stream</p><p className="mt-1 text-lg font-semibold">{profile.board} · {profile.stream}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><Target className="h-5 w-5 text-primary" /><p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Target</p><p className="mt-1 text-sm font-semibold">{profile.targetExams.map((exam) => exam === 'BOARDS' ? 'Boards' : exam === 'JEE_MAIN' ? 'JEE Main' : 'JEE Advanced').join(' + ')}</p></div>
          <div className="rounded-2xl border border-border bg-card p-5"><CalendarClock className="h-5 w-5 text-primary" /><p className="mt-4 text-xs uppercase tracking-wide text-muted-foreground">Daily goal</p><p className="mt-1 text-lg font-semibold">{profile.dailyStudyGoal} min</p></div>
        </section>

        <div className="mt-6 grid gap-5 lg:grid-cols-2">
          <section className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-2"><BookOpen className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Subjects</h2></div><div className="mt-4 flex flex-wrap gap-2">{profile.subjects.map((subject) => <span key={subject} className="rounded-full border border-border bg-background px-3 py-1.5 text-sm capitalize">{subject.replaceAll('-', ' ')}</span>)}</div></section>
          <section className="rounded-3xl border border-border bg-card p-6"><div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h2 className="text-xl font-bold">Needs more attention</h2></div>{profile.weakSubjects.length ? <div className="mt-4 flex flex-wrap gap-2">{profile.weakSubjects.map((subject) => <span key={subject} className="rounded-full bg-primary/10 px-3 py-1.5 text-sm capitalize text-primary">{subject.replaceAll('-', ' ')}</span>)}</div> : <p className="mt-4 text-sm text-muted-foreground">No weak subjects were selected during onboarding. Lernio can identify evidence-based weaknesses after practice data exists.</p>}</section>
        </div>

        <section className="mt-6 flex flex-col gap-4 rounded-3xl border border-border bg-card p-6 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-start gap-3"><UserRound className="mt-0.5 h-5 w-5 text-primary" /><div><h2 className="font-semibold">Academic profile is separate from your account.</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Changing your learning setup should not erase authentication, theme preferences or existing activity. Academic-profile editing is handled independently from account settings.</p></div></div><Link href="/settings" className="shrink-0 text-sm font-semibold text-primary">Open settings</Link></section>
      </main>
      <Footer />
    </div>
  )
}
