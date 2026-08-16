import Link from 'next/link'
import { redirect } from 'next/navigation'
import { ArrowRight, Brain, Clock3, History, Shuffle, Target, Zap } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getAcademicProfile } from '@/lib/academics/profile-store'
import { getCurriculumSubjects } from '@/lib/academics/curriculum'
import { isJeeProfile } from '@/lib/academics/types'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'

export const dynamic = 'force-dynamic'

const modes = [
  { title: 'Topic Practice', description: 'Focus on one concept at a time.', icon: Target },
  { title: 'Mixed Practice', description: 'Mix chapters and build retrieval strength.', icon: Shuffle },
  { title: 'Timed Practice', description: 'Train speed without jumping into a full mock.', icon: Clock3 },
  { title: 'Weak Topic Practice', description: 'Use mastery and mistake data to target weak areas.', icon: Brain },
]

export default async function PracticePage() {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/practice')
  const profile = await getAcademicProfile(user.id)
  if (!profile) redirect('/onboarding')

  const classLevels: ('11' | '12')[] = profile.classLevel === 'DROPPER' ? ['11', '12'] : [profile.classLevel]
  const jeeEnabled = isJeeProfile(profile)

  return (
    <div className="min-h-screen bg-background text-foreground">
      <TopBar />
      <main className="mx-auto w-full max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <header className="max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-primary">Practice engine</p>
          <h1 className="mt-2 text-3xl font-bold tracking-tight sm:text-4xl">Practice what matters.</h1>
          <p className="mt-3 text-muted-foreground">Choose a subject and Lernio will use published academic questions only. Wrong answers feed the Mistake Notebook and topic mastery automatically.</p>
        </header>

        <section className="mt-7 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {modes.map((mode) => (
            <div key={mode.title} className="rounded-2xl border border-border bg-card p-4">
              <mode.icon className="h-5 w-5 text-primary" />
              <h2 className="mt-3 font-semibold">{mode.title}</h2>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">{mode.description}</p>
            </div>
          ))}
        </section>

        {jeeEnabled && (
          <section className="mt-5 flex flex-col gap-4 rounded-2xl border border-primary/20 bg-primary/5 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <div className="flex items-center gap-2 text-sm font-semibold"><Zap className="h-4 w-4 text-primary" /> JEE practice enabled</div>
              <p className="mt-1 text-sm text-muted-foreground">Official PYQs are shown only when their source metadata is verified. AI-generated practice is never labelled as a PYQ.</p>
            </div>
            <Link href="/practice?mode=pyq" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-border bg-background px-4 py-2 text-sm font-semibold">PYQ Explorer <ArrowRight className="h-4 w-4" /></Link>
          </section>
        )}

        <div className="mt-10 space-y-9">
          {classLevels.map((classLevel) => {
            const subjects = getCurriculumSubjects(classLevel, profile.subjects)
            return (
              <section key={classLevel}>
                <div className="mb-4 flex items-end justify-between gap-3">
                  <div><p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Class {classLevel}</p><h2 className="mt-1 text-2xl font-bold">Choose a subject</h2></div>
                </div>
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                  {subjects.map((subject) => (
                    <Link
                      key={subject.id}
                      href={`/practice/session?class=${classLevel}&subject=${subject.slug}`}
                      className="group rounded-2xl border border-border bg-card p-5 transition hover:-translate-y-0.5 hover:border-primary/40"
                    >
                      <div className="flex items-center justify-between"><Target className="h-5 w-5 text-primary" /><ArrowRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" /></div>
                      <h3 className="mt-5 text-lg font-semibold">{subject.name}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{subject.chapters.length} chapters · board + eligible entrance modes</p>
                    </Link>
                  ))}
                </div>
              </section>
            )
          })}
        </div>

        <section className="mt-9 rounded-2xl border border-border bg-card p-5">
          <div className="flex items-center gap-3"><History className="h-5 w-5 text-primary" /><div><h2 className="font-semibold">Mistake Notebook</h2><p className="text-sm text-muted-foreground">Incorrect academic-practice answers are recorded for later revision instead of disappearing after a quiz.</p></div></div>
        </section>
      </main>
      <Footer />
    </div>
  )
}
