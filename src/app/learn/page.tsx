import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, BookOpen, GraduationCap, Target } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubjects } from '@/lib/academics/curriculum'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'

export const dynamic = 'force-dynamic'

export default async function LearnPage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/learn')

  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]
  const jeeEnabled = isJeeProfile(profile)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-primary">
            <span>{profile.board}</span>
            <span className="text-muted-foreground">•</span>
            <span>{profile.classLevel === 'DROPPER' ? 'JEE Dropper' : `Class ${profile.classLevel}`}</span>
            <span className="text-muted-foreground">•</span>
            <span>{profile.stream}</span>
          </div>
          <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Learn by subject, chapter and concept.</h1>
          <p className="mt-3 text-muted-foreground">
            Your curriculum is organized around school learning first, with JEE depth available where it is relevant to your profile.
          </p>
        </header>

        <div className="mt-7 grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl border border-border bg-card p-4">
            <BookOpen className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Structured curriculum</p>
            <p className="mt-1 text-xs text-muted-foreground">Board → Class → Subject → Chapter → Topic</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <GraduationCap className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">Boards mode</p>
            <p className="mt-1 text-xs text-muted-foreground">Concepts, notes, derivations and board-style practice.</p>
          </div>
          <div className="rounded-2xl border border-border bg-card p-4">
            <Target className="h-5 w-5 text-primary" />
            <p className="mt-3 text-sm font-semibold">{jeeEnabled ? 'JEE mode enabled' : 'Focused workspace'}</p>
            <p className="mt-1 text-xs text-muted-foreground">{jeeEnabled ? 'JEE practice and exam tools appear only for your PCM subjects.' : 'Irrelevant entrance-exam tools stay out of your way.'}</p>
          </div>
        </div>

        <div className="mt-10 space-y-10">
          {classLevels.map((classLevel) => {
            const subjects = getCurriculumSubjects(classLevel, profile.subjects)
            return (
              <section key={classLevel}>
                <div className="mb-4 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">CBSE / NCERT</p>
                    <h2 className="mt-1 text-2xl font-bold">Class {classLevel}</h2>
                  </div>
                  <p className="text-sm text-muted-foreground">{subjects.length} core subjects in your profile</p>
                </div>
                {subjects.length ? (
                  <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {subjects.map((subject) => (
                      <Link
                        key={subject.id}
                        href={`/learn/class/${classLevel}/${subject.slug}`}
                        className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-sm"
                      >
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary">
                            <BookOpen className="h-5 w-5" />
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                        <h3 className="mt-5 text-lg font-semibold">{subject.name}</h3>
                        <p className="mt-1 text-sm text-muted-foreground">{subject.chapters.length} chapters</p>
                        <p className="mt-4 text-xs text-muted-foreground">Open curriculum → notes, concepts, practice, revision and tests</p>
                      </Link>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 text-sm text-muted-foreground">
                    Curriculum for the subjects in this profile is not published yet. Lernio will not show fabricated lessons or resources.
                  </div>
                )}
              </section>
            )
          })}
        </div>
      </main>
    </div>
  )
}
