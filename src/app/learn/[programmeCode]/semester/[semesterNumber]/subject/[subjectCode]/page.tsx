import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { ArrowLeft, BookOpen, CheckCircle2, Layers3, PlayCircle, Target, Video, type LucideIcon } from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
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

  // Always use manifest data — it has the YouTube video resources
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
        <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
          <Link href={semesterHref} className="inline-flex w-fit items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-4 w-4" />
            <span className="hidden sm:inline">Semester {semesterNumber}</span>
            <span className="sm:hidden">Back</span>
          </Link>
          <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="h-3 w-3 rounded-full bg-primary" aria-hidden="true" />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {subjectCode}{subject.category ? ` / ${subject.category}` : ''}
                </p>
                {subject.priority === 'critical' && (
                  <span className="rounded bg-red-600/10 px-1.5 py-0.5 text-[10px] font-bold uppercase text-red-600">Critical</span>
                )}
              </div>
              <h1 className="mt-2 text-2xl font-bold tracking-tight sm:text-3xl">{subject.name}</h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">{subject.description}</p>
            </div>
            <div className="grid grid-cols-3 gap-2 sm:gap-3 lg:min-w-[320px]">
              <Metric icon={BookOpen} label="Credits" value={subject.credits} />
              <Metric icon={Video} label="Videos" value={subject.resources.length} />
              <Metric icon={Target} label="Scheme" value="R23" />
            </div>
          </div>
        </div>
      </section>

      {/* Coverage focus */}
      <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">
        <div className="rounded-lg border border-border bg-card p-4 sm:p-5">
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
            <span className="hidden text-xs text-muted-foreground sm:inline">Start here</span>
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
            <span className="hidden text-xs text-muted-foreground sm:inline">For deeper understanding</span>
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
          className="flex items-center justify-between rounded-lg border border-primary/30 bg-primary/5 p-4 sm:p-5 transition-colors hover:bg-primary/10"
        >
          <div className="min-w-0">
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Ready to start?</p>
            <h2 className="mt-1 text-base font-semibold sm:text-lg">Open Lesson: {subject.name}</h2>
            <p className="mt-1 text-sm text-muted-foreground hidden sm:block">Watch lectures, read notes, practise, and track progress</p>
          </div>
          <PlayCircle className="h-6 w-6 shrink-0 text-primary sm:h-8 sm:w-8" aria-hidden="true" />
        </Link>
      </section>
    </main>
  )
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return (
    <div className="rounded-lg border border-border bg-background p-2 sm:p-3">
      <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
      <p className="mt-1 text-lg font-bold sm:text-xl">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  )
}
