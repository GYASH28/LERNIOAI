import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, FileQuestion, FileText, Library, PlayCircle, Sigma } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubjects } from '@/lib/academics/curriculum'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

export default async function MaterialsPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/materials')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]
  const subjects = classLevels.flatMap((classLevel) => getCurriculumSubjects(classLevel, profile.subjects))
  const jeeEnabled = isJeeProfile(profile)

  const types = [
    { title: 'Notes', description: 'Quick, detailed, revision and exam notes.', icon: FileText },
    { title: 'Videos', description: 'Verified topic-linked educational videos only.', icon: PlayCircle },
    { title: 'Formula sheets', description: 'Physics, Chemistry and Mathematics key results.', icon: Sigma },
    { title: jeeEnabled ? 'PYQs & practice sets' : 'Practice sets', description: jeeEnabled ? 'Source-verified PYQs stay clearly separated from generated practice.' : 'Board-aligned practice resources by chapter.', icon: FileQuestion },
  ]

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Resource Library</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Everything useful, organized by what you study.</h1>
          <p className="mt-3 text-muted-foreground">Resources now follow Board → Class → Subject → Chapter instead of diploma semesters. Broken, unverified or old college-specific material is not shown.</p>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {types.map((type) => <div key={type.title} className="rounded-2xl border border-border bg-card p-4"><type.icon className="h-5 w-5 text-primary" /><h2 className="mt-3 font-semibold">{type.title}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{type.description}</p></div>)}
        </section>

        <section className="mt-9">
          <div className="mb-4 flex items-end justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Your curriculum</p><h2 className="mt-1 text-2xl font-bold">Browse by subject</h2></div><Library className="h-5 w-5 text-primary" /></div>
          {subjects.length ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {subjects.map((subject) => <Link key={subject.id} href={`/learn/class/${subject.classLevel}/${subject.slug}`} className="group rounded-2xl border border-border bg-card p-5 transition hover:border-primary/40"><div className="flex items-center justify-between"><BookOpen className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" /></div><h3 className="mt-5 text-lg font-semibold">Class {subject.classLevel} {subject.name}</h3><p className="mt-1 text-sm text-muted-foreground">{subject.chapters.length} chapters · open learning workspace</p></Link>)}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">No verified resource curriculum is published for these subjects yet.</div>
          )}
        </section>

        <section className="mt-7 rounded-3xl border border-dashed border-border bg-card p-7 text-center">
          <Library className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-4 text-xl font-semibold">Resource publishing is verification-first.</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Lernio no longer exposes the old R23 semester PDF catalogue here. New notes, videos, PYQs and sample papers will appear only after they are mapped to the new academic curriculum and their metadata is valid.</p>
        </section>
      </main>
      <Footer />
    </div>
  )
}
