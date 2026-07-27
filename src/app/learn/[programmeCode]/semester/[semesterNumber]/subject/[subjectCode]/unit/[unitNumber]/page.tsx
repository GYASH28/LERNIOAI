import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle2, PlayCircle, Target, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getUnitOverview } from '@/features/learning/server/get-unit-overview'
import { lessonRouteSlug } from '@/features/learning/utils/lesson-slugs'

export const dynamic = 'force-dynamic'

export default async function UnitLearningPage({
  params,
}: {
  params: Promise<{ programmeCode: string; semesterNumber: string; subjectCode: string; unitNumber: string }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode, unitNumber } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/unit/${unitNumber}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  const unitNo = Number.parseInt(unitNumber, 10)
  if (!Number.isInteger(semester) || !Number.isInteger(unitNo)) notFound()

  const overview = await getUnitOverview(authUser.id, {
    programmeCode,
    semesterNumber: semester,
    subjectCode,
    unitNumber: unitNo,
  })
  if (!overview) notFound()

  const subjectHref = `/learn/${overview.programme.code}/semester/${overview.semester.number}/subject/${overview.subject.code}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 sm:px-6 lg:px-8">
          <Link
            href={subjectHref}
            className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            {overview.subject.code}
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                Unit {overview.unit.number}
              </p>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                {overview.unit.title}
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                {overview.subject.name}
              </p>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[390px]">
              <Metric icon={Target} label="Topics" value={overview.unit.topicCount} />
              <Metric icon={BookOpen} label="Lessons" value={overview.unit.lessonCount} />
              <Metric icon={CheckCircle2} label="Done" value={overview.unit.completedLessonCount} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          <div className="grid gap-3">
            {overview.unit.lessons.length > 0 ? (
              overview.unit.lessons.map((lesson) => (
                <Link
                  key={lesson.id}
                  href={`/learn/${overview.programme.code}/semester/${overview.semester.number}/subject/${overview.subject.code}/lesson/${lessonRouteSlug(lesson)}`}
                  className="grid gap-3 rounded-lg border border-border bg-card p-4 transition-colors hover:bg-muted/40 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                      <PlayCircle className="h-4 w-4 text-primary" aria-hidden="true" />
                      Lesson {lesson.order}
                    </div>
                    <h2 className="mt-1 text-base font-semibold tracking-normal">{lesson.title}</h2>
                    {lesson.topicTitle ? (
                      <p className="mt-1 text-xs text-muted-foreground">{lesson.topicTitle}</p>
                    ) : null}
                  </div>
                  <div className="rounded-md bg-muted px-3 py-2 text-center">
                    <p className="text-sm font-bold">{lesson.durationMin}</p>
                    <p className="text-[11px] text-muted-foreground">Minutes</p>
                  </div>
                </Link>
              ))
            ) : (
              <div className="rounded-lg border border-dashed border-border bg-card p-6">
                <h2 className="text-base font-semibold tracking-normal">Lessons are being prepared</h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  This unit is in the scoped curriculum, but no published lessons are available yet.
                </p>
              </div>
            )}
          </div>

          <aside className="h-fit rounded-lg border border-border bg-card p-4">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Topics</h2>
            <div className="mt-3 grid gap-2">
              {overview.unit.topics.map((topic) => (
                <div
                  key={topic.id}
                  id={`topic-${topic.slug || topic.id}`}
                  className="rounded-md bg-muted px-3 py-2 scroll-mt-24"
                >
                  <p className="text-sm font-medium">{topic.title}</p>
                  <p className="mt-1 text-xs text-muted-foreground capitalize">
                    {topic.difficulty} / {topic.examWeightage}% exam weight
                  </p>
                </div>
              ))}
            </div>
          </aside>
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
  value: number
}) {
  return (
    <div className="rounded-lg border border-border bg-background p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <p className="mt-2 text-xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
