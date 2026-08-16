import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookCheck, Clock3, FileText, GraduationCap, SlidersHorizontal, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function ExamsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/exams')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')
  const jeeEnabled = isJeeProfile(profile)

  const testTypes = [
    { title: 'Chapter Test', description: 'Check one chapter after learning and practice.', icon: BookCheck, href: '/practice' },
    { title: 'Subject Test', description: 'Build a broader subject-level checkpoint.', icon: Target, href: '/practice' },
    { title: 'Custom Test', description: 'Choose class, subject, chapters, question count and difficulty.', icon: SlidersHorizontal, href: '/exams/custom' },
    { title: 'Boards Mock', description: 'Board-style objective and subjective paper workflows.', icon: FileText, href: '/exams/boards' },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Tests</p><h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Test more than memory.</h1><p className="mt-3 text-muted-foreground">Topic, chapter, subject, boards and entrance-exam testing live in one system. Exam patterns are configuration-driven so official changes don’t require rewriting the product.</p></header>

        <section className="mt-7 grid gap-4 md:grid-cols-2">
          {testTypes.map((type) => <Link key={type.title} href={type.href} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"><div className="flex items-start justify-between gap-4"><type.icon className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><h2 className="mt-5 text-lg font-semibold">{type.title}</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{type.description}</p></Link>)}
        </section>

        {jeeEnabled && <section className="mt-6 rounded-3xl border border-primary/20 bg-primary/5 p-6 sm:p-7"><div className="flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between"><div><div className="flex items-center gap-2 font-semibold"><GraduationCap className="h-5 w-5 text-primary" /> JEE mock mode</div><h2 className="mt-2 text-2xl font-bold">Simulate the exam, then analyse the strategy.</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Physics, Chemistry and Mathematics sections can be generated from a versioned exam-pattern configuration. Lernio will not silently assume a future year’s marking scheme before that official pattern is available.</p></div><Link href="/exams/jee" className="inline-flex shrink-0 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">JEE test mode <ArrowRight className="h-4 w-4" /></Link></div></section>}

        <section className="mt-6 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4"><Clock3 className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold">Timer + autosave</p><p className="mt-1 text-xs text-muted-foreground">Test attempts will persist responses instead of depending on client-only state.</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><Target className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold">Topic breakdown</p><p className="mt-1 text-xs text-muted-foreground">Analysis is tied to question metadata and mastery records.</p></div>
          <div className="rounded-2xl border border-border bg-card p-4"><FileText className="h-5 w-5 text-primary" /><p className="mt-3 text-sm font-semibold">No fake scores</p><p className="mt-1 text-xs text-muted-foreground">Results appear only after a real submitted attempt.</p></div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
