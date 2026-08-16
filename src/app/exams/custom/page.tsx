import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, SlidersHorizontal } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubjects } from '@/lib/academics/curriculum'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function CustomTestPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/exams/custom')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]

  return <div className="min-h-screen bg-background text-foreground"><TopBar /><main className="mx-auto w-full max-w-5xl px-5 py-8 sm:px-6"><Link href="/exams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tests</Link><header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Custom Test</p><h1 className="mt-2 text-3xl font-bold tracking-tight">Build from the curriculum you actually study.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Choose a chapter below to begin a focused question session now. The full timed multi-section builder will use the same verified question bank rather than a separate demo dataset.</p></header><div className="mt-7 space-y-8">{classLevels.map((classLevel) => <section key={classLevel}><h2 className="mb-3 text-lg font-semibold">Class {classLevel}</h2><div className="grid gap-3 md:grid-cols-2">{getCurriculumSubjects(classLevel, profile.subjects).flatMap((subject) => subject.chapters.slice(0,6).map((chapter) => <Link key={`${subject.id}-${chapter.id}`} href={`/practice/session?class=${classLevel}&subject=${subject.slug}&chapter=${chapter.slug}&mode=custom`} className="group rounded-2xl border border-border bg-card p-4 hover:border-primary/40"><div className="flex items-center justify-between"><div><p className="text-xs font-semibold uppercase text-primary">{subject.name}</p><p className="mt-1 font-medium">{chapter.name}</p></div><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div></Link>))}</div></section>)}</div><div className="mt-7 flex items-start gap-3 rounded-2xl border border-border bg-card p-5"><SlidersHorizontal className="mt-0.5 h-5 w-5 text-primary" /><p className="text-sm leading-6 text-muted-foreground">Question count, difficulty, PYQ-only, mistakes-only and bookmark filters are part of the test-engine configuration layer; unavailable filters are not shown as dead controls here.</p></div></main></div>
}
