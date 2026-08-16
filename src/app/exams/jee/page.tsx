import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, ArrowRight, GraduationCap, ShieldCheck } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function JeeTestPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/exams/jee')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  if (!isJeeProfile(profile)) redirect('/exams')

  const classLevel = profile.classLevel === '11' ? '11' : '12'
  return <div className="min-h-screen bg-background text-foreground"><TopBar /><main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6"><Link href="/exams" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Tests</Link><header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">JEE mode</p><h1 className="mt-2 text-3xl font-bold tracking-tight">JEE practice with source and pattern integrity.</h1><p className="mt-2 text-sm leading-6 text-muted-foreground">Full mock patterns are intentionally configuration-driven. Until a versioned mock configuration and sufficient verified questions are published, Lernio exposes verified PYQ practice instead of pretending a partial set is a realistic full exam.</p></header><section className="mt-7 rounded-3xl border border-primary/20 bg-primary/5 p-6"><div className="flex items-start gap-3"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-primary" /><div><h2 className="font-semibold">What works now</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Choose Physics, Chemistry or Mathematics. PYQ mode only returns records whose source is explicitly verified as `PYQ`.</p></div></div><div className="mt-5 grid gap-3 sm:grid-cols-3">{['physics','chemistry','mathematics'].map((subject) => <Link key={subject} href={`/practice/session?class=${classLevel}&subject=${subject}&mode=pyq`} className="group rounded-xl border border-border bg-background p-4 capitalize"><GraduationCap className="h-4 w-4 text-primary" /><div className="mt-3 flex items-center justify-between gap-2"><span className="font-semibold">{subject}</span><ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-primary" /></div></Link>)}</div></section></main></div>
}
