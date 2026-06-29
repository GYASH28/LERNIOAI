import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, Clock3, Layers3, Target, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSemesterOverview } from '@/features/learning/server/get-semester-overview'

export const dynamic = 'force-dynamic'

export default async function SemesterLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester)) notFound()

  const overview = await getSemesterOverview(authUser.id, {
    programmeCode,
    semesterNumber: semester,
  })
  if (!overview) notFound()

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href="/learn"
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Learn
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                {overview.programme.code} / {overview.scheme.code}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                Semester {overview.semester.number}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {overview.programme.name}
              </p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric icon={BookOpen} label="Subjects" value={overview.totals.subjectCount} />
              <Metric icon={Layers3} label="Units" value={overview.totals.unitCount} />
              <Metric icon={Target} label="Progress" value={`${overview.totals.completionPercent}%`} />
              <Metric icon={Clock3} label="Minutes" value={overview.totals.durationMinutes} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        {overview.continueLearning ? (
          <Link
            href={overview.continueLearning.href}
            className="mb-5 grid gap-4 rounded-lg border border-primary/30 bg-primary/5 p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
          >
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Continue Learning</p>
              <h2 className="mt-1 truncate text-lg font-semibold tracking-normal">
                {overview.continueLearning.lessonTitle}
              </h2>
              <p className="mt-1 text-sm text-muted-foreground">
                {overview.continueLearning.subjectCode} / Unit {overview.continueLearning.unitNumber} / {overview.continueLearning.mode}
              </p>
            </div>
            <span className="inline-flex h-10 items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground">
              <BookOpen className="h-4 w-4" />
              Resume
            </span>
          </Link>
        ) : null}
        <div className="grid gap-3">
          {overview.subjects.map((subject) => (
            <Link
              key={subject.id}
              href={`/learn/${overview.programme.code}/semester/${overview.semester.number}/subject/${subject.code}`}
              className="grid gap-4 rounded-lg border border-border bg-card p-4 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
            >
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: subject.accentColor }}
                    aria-hidden="true"
                  />
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    {subject.code}{subject.category ? ` / ${subject.category}` : ''}
                  </p>
                </div>
                <h2 className="mt-1 truncate text-lg font-semibold tracking-normal">{subject.name}</h2>
              </div>
              <div className="grid grid-cols-4 gap-2 text-center sm:min-w-[360px]">
                <SubjectMetric label="Credits" value={subject.credits} />
                <SubjectMetric label="Units" value={subject.unitCount} />
                <SubjectMetric label="Lessons" value={subject.lessonCount} />
                <SubjectMetric label="Done" value={subject.completedLessonCount} />
              </div>
            </Link>
          ))}
        </div>
      </section>
    </main>
  )
}

function Metric({
  icon: Icon,
  label,
  value,
}: {
  icon: LucideIcon
  label: string
  value: number | string
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}

function SubjectMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
