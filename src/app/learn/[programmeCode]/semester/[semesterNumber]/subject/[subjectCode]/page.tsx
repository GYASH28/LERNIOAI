import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle2, Layers3, PlayCircle, Target, Video, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getSubjectOverview } from '@/features/learning/server/get-subject-overview'
import { getManifestSubject, type ManifestSubject } from '@/lib/curriculum/manifest-data'
import { YouTubePlayer } from '@/components/learning/youtube-player'

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

  // Try DB first
  let overview = null
  try {
    overview = await getSubjectOverview(authUser.id, {
      programmeCode,
      semesterNumber: semester,
      subjectCode,
    })
  } catch {
    // DB unavailable — fall through to manifest
  }

  if (overview && overview.units.length > 0) {
    return <DBSubjectView overview={overview} />
  }

  // Fallback: manifest-based view with YouTube resources
  const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!manifestSubject) notFound()

  return (
    <ManifestSubjectView
      programmeCode={programmeCode}
      semesterNumber={semester}
      subject={manifestSubject}
    />
  )
}

// ─── DB-backed view (existing) ──────────────────────────────────────────────

function DBSubjectView({ overview }: { overview: NonNullable<Awaited<ReturnType<typeof getSubjectOverview>>> }) {
  const semesterHref = `/learn/${overview.programme.code}/semester/${overview.semester.number}`
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Link href={semesterHref} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Semester {overview.semester.number}
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {overview.subject.code}{overview.subject.category ? ` / ${overview.subject.category}` : ''}
                </p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">{overview.subject.name}</h1>
              {overview.subject.description ? <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{overview.subject.description}</p> : null}
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
            <Link key={unit.id} href={`/learn/${overview.programme.code}/semester/${overview.semester.number}/subject/${overview.subject.code}/unit/${unit.number}`} className="rounded-lg border border-border bg-card p-4">
              <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-start">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Unit {unit.number}</p>
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
                    <span key={topic.id} className="rounded-md bg-muted px-2.5 py-1 text-xs font-medium text-muted-foreground">{topic.title}</span>
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

// ─── Manifest-based view with YouTube resources ─────────────────────────────

function ManifestSubjectView({
  programmeCode,
  semesterNumber,
  subject,
}: {
  programmeCode: string
  semesterNumber: number
  subject: ManifestSubject
}) {
  const subjectCode = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
  const semesterHref = `/learn/${programmeCode}/semester/${semesterNumber}`
  const lessonSlug = subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
  const lessonHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson/${lessonSlug}`

  const primaryVideos = subject.resources.filter((r) => r.role === 'primary_video')
  const alternateVideos = subject.resources.filter((r) => r.role !== 'primary_video')

  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero */}
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-4 py-8 sm:px-6 lg:px-8">
          <Link href={semesterHref} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            Semester {semesterNumber}
          </Link>
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {subjectCode}{subject.category ? ` / ${subject.category}` : ''}
                </p>
                {subject.priority === 'critical' && (
                  <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Critical</span>
                )}
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">{subject.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subject.description}</p>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:min-w-[400px]">
              <Metric icon={BookOpen} label="Credits" value={subject.credits} />
              <Metric icon={Video} label="Videos" value={subject.resources.length} />
              <Metric icon={Target} label="Scheme" value="R23" />
            </div>
          </div>
        </div>
      </section>

      {/* Coverage focus */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-5">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Coverage Focus</h2>
          <p className="mt-2 text-sm text-foreground">{subject.coverageFocus}</p>
        </div>
      </section>

      {/* Primary video lectures */}
      {primaryVideos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <PlayCircle className="h-5 w-5 text-primary" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Primary Lecture{primaryVideos.length > 1 ? 's' : ''}</h2>
            <span className="text-xs text-muted-foreground">Start here</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {primaryVideos.map((resource, i) => (
              <YouTubePlayer
                key={i}
                url={resource.url}
                title={resource.title}
                channel={resource.channel}
                language={resource.language}
                description={resource.description}
                isPlaylist={!!resource.playlistId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Alternate video lectures */}
      {alternateVideos.length > 0 && (
        <section className="mx-auto max-w-6xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="mb-4 flex items-center gap-2">
            <Video className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
            <h2 className="text-lg font-semibold">Alternate Lectures</h2>
            <span className="text-xs text-muted-foreground">For deeper understanding</span>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {alternateVideos.map((resource, i) => (
              <YouTubePlayer
                key={i}
                url={resource.url}
                title={resource.title}
                channel={resource.channel}
                language={resource.language}
                description={resource.description}
                isPlaylist={!!resource.playlistId}
              />
            ))}
          </div>
        </section>
      )}

      {/* Start lesson CTA */}
      <section className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8">
        <Link
          href={lessonHref}
          className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-5 transition-colors hover:bg-primary/10"
        >
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ready to start?</p>
            <h2 className="mt-1 text-lg font-semibold">Open Lesson: {subject.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground">Watch lectures, read notes, practise, and track progress</p>
          </div>
          <PlayCircle className="h-8 w-8 text-primary" aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
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
