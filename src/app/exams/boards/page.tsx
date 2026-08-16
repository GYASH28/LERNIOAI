import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, BookOpenCheck, FileText } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function BoardsTestPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/exams/boards')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  return <div className="min-h-screen bg-background text-foreground"><TopBar /><main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6"><Link href="/exams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tests</Link><header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Boards mode</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Board preparation without pretend papers.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">This workspace is reserved for board-style short answers, long answers, numericals, case-based questions, derivations and sample-paper attempts mapped to {profile.board}.</p></header><section className="mt-7 grid gap-4 sm:grid-cols-2"><Link href="/practice" className="rounded-2xl border border-border bg-card p-5 hover:border-primary/40"><BookOpenCheck className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">Chapter practice</h2><p className="mt-1 text-sm text-muted-foreground">Start with currently published academic questions.</p></Link><div className="rounded-2xl border border-dashed border-border bg-card p-5"><FileText className="h-5 w-5 text-muted-foreground" /><h2 className="mt-4 font-semibold">Full board papers</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">No verified full paper is published yet. Lernio will not generate a fake official sample paper to fill this area.</p></div></section></main></div>
}
