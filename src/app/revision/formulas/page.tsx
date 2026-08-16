import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowLeft, Sigma } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function FormulaVaultPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/revision/formulas')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const subjects = profile.subjects.filter((subject) => ['physics', 'chemistry', 'mathematics'].includes(subject))
  return (
    <div className="min-h-screen bg-background text-foreground"><TopBar /><main className="mx-auto w-full max-w-4xl px-5 py-8 sm:px-6">
      <Link href="/revision" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Revision</Link>
      <header className="mt-5"><p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">Formula Vault</p><h1 className="mt-2 text-3xl font-bold tracking-tight">The formulas you actually need.</h1><p className="mt-2 text-sm text-muted-foreground">Physics, Physical Chemistry and Mathematics formulae will live here with meaning, units, conditions, examples and common mistakes.</p></header>
      <div className="mt-7 grid gap-3 sm:grid-cols-3">{subjects.map((subject) => <Link key={subject} href={`/learn?subject=${subject}`} className="rounded-2xl border border-border bg-card p-5 capitalize hover:border-primary/40"><Sigma className="h-5 w-5 text-primary" /><h2 className="mt-4 font-semibold">{subject}</h2><p className="mt-1 text-xs text-muted-foreground">Browse curriculum</p></Link>)}</div>
      <section className="mt-6 rounded-3xl border border-dashed border-border bg-card p-7 text-center"><Sigma className="mx-auto h-8 w-8 text-muted-foreground" /><h2 className="mt-4 text-xl font-semibold">No verified formula cards published yet.</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">The route is live, but Lernio won’t ship placeholder formulae. Formula cards will be published from the structured Class 11/12 curriculum with verification and exam tags{isJeeProfile(profile) ? ' for Boards and JEE' : ' for your board profile'}.</p></section>
    </main></div>
  )
}
