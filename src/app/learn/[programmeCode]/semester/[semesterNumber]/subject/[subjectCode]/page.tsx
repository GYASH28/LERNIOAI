import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle2, Layers3, Target, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSubjectOverview } from '@/features/learning/server/get-subject-overview'

export const dynamic = 'force-dynamic'

export default async function SubjectLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string; subjectCode: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester)) notFound()

  const overview = await getSubjectOverview(authUser.id, {
    programmeCode,
    semesterNumber: semester,
    subjectCode,
  })
  if (!overview) notFound()

  const semesterHref = `/learn/${overview.programme.code}/semester/${overview.semester.number}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Link
            href={semesterHref}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Semester {overview.semester.number}
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: overview.subject.accentColor }}
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {overview.subject.code}{overview.subject.category ? ` / ${overview.subject.category}` : ''}
                </p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                {overview.subject.name}
              </h1>
              {overview.subject.description ? (
                <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                  {overview.subject.description}
                </p>
              ) : null}
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[520px]">
              <Metric icon={BookOpen} label="Credits" value={overview.subject.credits} />
              <Metric icon={Layers3} label="Units" value={overview.units.length} />
              <Metric icon={Target} label="Topics" value={overview.totals.topicCount} />
              <Metric icon={CheckCircle2} label="Done" value={`${overview.totals.completionPercent}%`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-4">
          {overview.units.map((unit) => (
            <Link
              key={unit.id}
              href={`/learn/${overview.programme.code}/semester/${overview.semester.number}/subject/${overview.subject.code}/unit/${unit.number}`}
              className="rounded-lg border border-border bg-card p-4"
            >
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Unit {unit.number}
                  </p>
                  <h2 className="mt-1 text-lg font-semibold tracking-normal">{unit.title}</h2>
                </div>
                <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[260px]">
                  <UnitMetric label="Topics" value={unit.topicCount} />
                  <UnitMetric label="Lessons" value={unit.lessonCount} />
                  <UnitMetric label="Done" value={unit.completedLessonCount} />
                </div>
              </div>
              {unit.topics.length > 0 ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  {unit.topics.map((topic) => (
                    <span
                      key={topic.id}
                      className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {topic.title}
                    </span>
                  ))}
                </div>
              ) : null}
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

function UnitMetric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-md bg-muted px-2 py-2">
      <p className="text-sm font-bold">{value}</p>
      <p className="text-[11px] text-muted-foreground">{label}</p>
    </div>
  )
}
