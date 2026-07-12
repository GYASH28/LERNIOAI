import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  ExternalLink,
  FileText,
  ListChecks,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Target,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import {
  LESSON_MODE_KEYS,
  getLessonStudio,
  type LessonModeKey,
  type LessonStudioResource,
} from '@/features/learning/server/get-lesson-studio'
import { LessonModeCompletionButton } from '@/features/learning/components/lesson/lesson-mode-completion-button'
import { LessonVisitRecorder } from '@/features/learning/components/lesson/lesson-visit-recorder'
import { LessonVideoPlayer } from '@/features/learning/components/lesson/lesson-video-player'
import { getManifestSubject, type ManifestSubject } from '@/lib/curriculum/manifest-data'
import { generateLessonNotes } from '@/lib/curriculum/lesson-notes/notes-generator'
import { getSubjectNotes, findLessonBySlug, getAdjacentLessons } from '@/lib/curriculum/lesson-notes-loader'
import { LessonNotesRenderer } from '@/components/learning/lesson-notes-renderer'
import { InteractiveNotesRenderer } from '@/components/learning/interactive-notes-renderer'
import { YouTubePlayer } from '@/components/learning/youtube-player-lazy'
import { BookmarkButton } from '@/components/learning/bookmark-button'
import { RecentlyViewedTracker } from '@/components/learning/recently-viewed-tracker'

export const dynamic = 'force-dynamic'

export default async function LessonStudioPage({
  params,
}: {
  params: Promise<{
    programmeCode: string
    semesterNumber: string
    subjectCode: string
    lessonSlug: string
  }>
}) {
  const authUser = await getCurrentUser()
  const { programmeCode, semesterNumber, subjectCode, lessonSlug } = await params
  if (!authUser) {
    redirect(`/sign-in?callbackUrl=/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson/${lessonSlug}`)
  }

  const semester = Number.parseInt(semesterNumber, 10)
  if (!Number.isInteger(semester)) notFound()

  let studio = null
  try {
    studio = await getLessonStudio(authUser.id, {
      programmeCode,
      semesterNumber: semester,
      subjectCode,
      lessonSlug,
    })
  } catch {
    // DB unavailable — fall through to manifest fallback
  }

  // Manifest fallback: if DB has no lesson, show manifest-based lesson view
  if (!studio) {
    const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
    if (manifestSubject) {
      // Accept ANY lesson slug for a valid subject — the ManifestLessonView
      // will try to find a specific V3 lesson match, and if none, will show
      // the whole-subject accordion. This way lesson links from the materials
      // page and unit map always work (no 404s).
      return (
        <ManifestLessonView
          programmeCode={programmeCode}
          semesterNumber={semester}
          subjectCode={subjectCode}
          lessonSlug={lessonSlug}
          subject={manifestSubject}
        />
      )
    }
    notFound()
  }
  if (studio.needsCanonicalRedirect) redirect(studio.canonicalPath)

  const unitHref = `/learn/${studio.programme.code}/semester/${studio.semester.number}/subject/${studio.subject.code}/unit/${studio.unit.number}`
  const subjectHref = `/learn/${studio.programme.code}/semester/${studio.semester.number}/subject/${studio.subject.code}`
  const primaryVideoProgress = studio.resources.primaryVideo
    ? studio.videoProgress.find((item) => item.resourceId === studio.resources.primaryVideo?.id)
    : null
  const tutorHref = `/tutor?${new URLSearchParams({
    subjectId: studio.subject.id,
    unitNumber: String(studio.unit.number),
    lessonId: studio.lesson.id,
    ...(studio.topic ? { topicId: studio.topic.id } : {}),
  }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({
    subjectId: studio.subject.id,
    unitNumber: String(studio.unit.number),
    lessonId: studio.lesson.id,
    ...(studio.topic ? { topicId: studio.topic.id } : {}),
  }).toString()}`
  const lessonMaterialsHref = `/materials?${new URLSearchParams({
    lessonId: studio.lesson.id,
  }).toString()}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LessonVisitRecorder lessonId={studio.lesson.id} />
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto flex max-w-7xl flex-col gap-6 px-5 py-6 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={subjectHref} className="inline-flex items-center gap-2 font-medium hover:text-foreground">
              <ArrowLeft className="h-4 w-4" />
              {studio.subject.code}
            </Link>
            <span>/</span>
            <Link href={unitHref} className="font-medium hover:text-foreground">
              Unit {studio.unit.number}
            </Link>
            {studio.topic ? (
              <>
                <span>/</span>
                <span>{studio.topic.title}</span>
              </>
            ) : null}
          </div>

          <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="h-3 w-3 rounded-full"
                  style={{ backgroundColor: studio.subject.accentColor }}
                  aria-hidden="true"
                />
                <p className="text-sm font-semibold uppercase tracking-wide text-primary">
                  {studio.programme.code} / Semester {studio.semester.number} / Lesson {studio.lesson.order}
                </p>
              </div>
              <h1 className="mt-2 text-3xl font-bold tracking-normal sm:text-4xl">
                {studio.lesson.title}
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                {studio.subject.name} / {studio.unit.title}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
              <Metric icon={Clock3} label="Minutes" value={studio.lesson.durationMin} />
              <Metric icon={CheckCircle2} label="Modes" value={`${studio.completion.completedModeCount}/5`} />
              <Metric icon={Target} label="Progress" value={`${studio.completion.percent}%`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[280px_minmax(0,1fr)_320px] lg:px-8">
        <aside className="h-fit rounded-lg border border-border bg-card p-4 lg:sticky lg:top-6">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Curriculum</h2>
          <div className="mt-3 grid gap-4">
            {studio.navigation.units.map((unit) => (
              <div key={unit.id}>
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Unit {unit.number}
                </p>
                <div className="mt-2 grid gap-1">
                  {unit.lessons.map((lesson) => (
                    <Link
                      key={lesson.id}
                      href={lesson.href}
                      className={`rounded-md px-3 py-2 text-sm transition-colors ${
                        lesson.isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'
                      }`}
                    >
                      <span className="block font-medium">{lesson.title}</span>
                      {lesson.topicTitle ? (
                        <span className={lesson.isActive ? 'text-primary-foreground/75' : 'text-muted-foreground'}>
                          {lesson.topicTitle}
                        </span>
                      ) : null}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="grid gap-6">
          <section className="overflow-hidden rounded-lg border border-border bg-card">
            {studio.resources.primaryVideo?.embedUrl ? (
              <LessonVideoPlayer
                lessonId={studio.lesson.id}
                resourceId={studio.resources.primaryVideo.id}
                title={studio.resources.primaryVideo.title}
                embedUrl={studio.resources.primaryVideo.embedUrl}
                chapters={studio.resources.primaryVideo.chapters}
                initialLastSecond={primaryVideoProgress?.lastSecond ?? 0}
              />
            ) : (
              <div className="grid aspect-video place-items-center bg-muted px-6 text-center">
                <div>
                  <Video className="mx-auto h-8 w-8 text-muted-foreground" />
                  <h2 className="mt-3 text-lg font-semibold tracking-normal">Primary lecture pending review</h2>
                  <p className="mt-2 max-w-md text-sm text-muted-foreground">
                    No approved embeddable lecture is attached to this lesson yet.
                  </p>
                </div>
              </div>
            )}

            {studio.resources.primaryVideo ? (
              <div className="grid gap-4 border-t border-border p-4 md:grid-cols-[minmax(0,1fr)_auto]">
                <ResourceSummary
                  resource={studio.resources.primaryVideo}
                  fallbackReason={studio.resources.primaryVideoFallbackReason}
                />
                {studio.resources.primaryVideo.url ? (
                  <a
                    href={studio.resources.primaryVideo.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
                  >
                    <ExternalLink className="h-4 w-4" />
                    Open source
                  </a>
                ) : null}
              </div>
            ) : null}
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex flex-wrap gap-2">
              {studio.lesson.modes.map((mode) => (
                <a
                  key={mode.key}
                  href={`#mode-${mode.key}`}
                  className={`inline-flex items-center gap-2 rounded-md border px-3 py-2 text-sm font-medium ${
                    mode.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-muted'
                  }`}
                >
                  {mode.completed ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}
                  {mode.label}
                </a>
              ))}
            </div>
          </section>

          {LESSON_MODE_KEYS.map((mode) => (
            <ModeSection
              key={mode}
              lessonId={studio.lesson.id}
              mode={mode}
              rawContent={studio.lesson.modeContent[mode]}
              completed={studio.lesson.modes.find((item) => item.key === mode)?.completed ?? false}
            />
          ))}

          <section className="grid gap-4 rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              <h2 className="text-lg font-semibold tracking-normal">Interactive Study Notes</h2>
            </div>

            {/* V3 Interactive Notes — render the SPECIFIC lesson if found */}
            {(() => {
              const subjectNotes = getSubjectNotes(studio.subject.code)
              if (!subjectNotes) return null

              // Try to find the specific lesson by slug
              const match = findLessonBySlug(studio.subject.code, lessonSlug)
              if (match) {
                const { prev, next } = getAdjacentLessons(studio.subject.code, lessonSlug)
                const lessonBaseHref = `/learn/${studio.programme.code}/semester/${studio.semester.number}/subject/${studio.subject.code}/lesson`
                return (
                  <InteractiveNotesRenderer
                    lesson={match.lesson}
                    subject={subjectNotes}
                    prevHref={prev ? `${lessonBaseHref}/${prev.slug}` : null}
                    nextHref={next ? `${lessonBaseHref}/${next.slug}` : null}
                  />
                )
              }

              // Fallback: show all units/lessons as collapsible accordion
              return <LessonNotesRenderer notes={subjectNotes} />
            })()}

            {/* DB-generated documents */}
            {studio.generatedDocuments.length > 0 || studio.resources.notes.length > 0 ? (
              <div className="grid gap-3">
                {studio.generatedDocuments.map((document) => (
                  <div key={document.id} className="rounded-md bg-muted p-3">
                    <p className="font-medium capitalize">{document.documentType.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Version {document.version}
                      {document.pageCount ? ` / ${document.pageCount} pages` : ''}
                      {document.publishedAt ? ` / published ${formatDate(document.publishedAt)}` : ''}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {document.htmlHref ? (
                        <a
                          href={document.htmlHref}
                          target="_blank"
                          rel="noreferrer"
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        >
                          <ExternalLink className="h-4 w-4" />
                          Open HTML
                        </a>
                      ) : null}
                      {document.pdfHref ? (
                        <a
                          href={document.pdfHref}
                          className="inline-flex items-center gap-2 text-sm font-medium text-primary"
                        >
                          <FileText className="h-4 w-4" />
                          Download PDF
                        </a>
                      ) : null}
                    </div>
                  </div>
                ))}
                {studio.resources.notes.map((resource) => (
                  <ResourceLink key={resource.lessonResourceId} resource={resource} />
                ))}
              </div>
            ) : !getSubjectNotes(studio.subject.code) ? (
              <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center">
                <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                <p className="text-sm font-medium">Detailed notes coming soon</p>
                <p className="text-xs text-muted-foreground mt-1">
                  We&apos;re writing comprehensive study notes for this subject. Check back soon!
                </p>
                {/* PDF fallback — link to the subject's PDF if it exists */}
                {(() => {
                  const pdfUrl = `/lesson-notes/${studio.subject.code.toLowerCase().replace(/[^a-z0-9]+/g, '-')}-${studio.subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`
                  return (
                    <a
                      href={`/lesson-notes/${studio.subject.code.toLowerCase()}-${studio.subject.name.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.pdf`}
                      className="mt-3 inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-xs font-medium hover:bg-accent/50"
                    >
                      <FileText className="h-3.5 w-3.5" /> Download PDF Summary
                    </a>
                  )
                })()}
              </div>
            ) : null}
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {studio.navigation.previousLesson ? (
              <Link
                href={studio.navigation.previousLesson.href}
                className="rounded-lg border border-border bg-card p-4 hover:bg-muted/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Previous</p>
                <p className="mt-1 font-medium">{studio.navigation.previousLesson.title}</p>
              </Link>
            ) : null}
            {studio.navigation.nextLesson ? (
              <Link
                href={studio.navigation.nextLesson.href}
                className="rounded-lg border border-border bg-card p-4 text-right hover:bg-muted/40"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Next</p>
                <p className="mt-1 font-medium">{studio.navigation.nextLesson.title}</p>
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="grid h-fit gap-4 lg:sticky lg:top-6">
          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold tracking-normal">Completion</h2>
            </div>
            <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full bg-primary" style={{ width: `${studio.completion.percent}%` }} />
            </div>
            <div className="mt-4 grid gap-2">
              {studio.lesson.modes.map((mode) => (
                <div key={mode.key} className="flex items-center justify-between gap-3 text-sm">
                  <span>{mode.label}</span>
                  <span className={mode.completed ? 'font-medium text-primary' : 'text-muted-foreground'}>
                    {mode.completed ? 'Done' : `${Math.round(mode.progress)}%`}
                  </span>
                </div>
              ))}
            </div>
            <div className="mt-4 rounded-md bg-muted p-3 text-xs text-muted-foreground">
              Video {studio.completion.minimumVideoPercent}% minimum
              {studio.completion.requirePractice ? ' / practice required' : ''}
              {studio.completion.requireQuizPass ? ' / quiz pass required' : ''}
              {studio.completion.requireExplicitDone ? ' / explicit done required' : ''}
            </div>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold tracking-normal">LEO</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Ask from this subject, unit, lesson, and approved resources.
            </p>
            <Link
              href={tutorHref}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md bg-primary px-3 text-sm font-medium text-primary-foreground"
            >
              <Sparkles className="h-4 w-4" />
              Ask LEO
            </Link>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-primary" />
              <h2 className="text-base font-semibold tracking-normal">Practice</h2>
            </div>
            <p className="mt-2 text-sm text-muted-foreground">
              Start question practice from this subject, unit and topic context.
            </p>
            <Link
              href={practiceHref}
              className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
            >
              <Target className="h-4 w-4" />
              Practise this lesson
            </Link>
          </section>

          <section className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-base font-semibold tracking-normal">Resources</h2>
              <Link
                href={lessonMaterialsHref}
                className="inline-flex h-9 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium hover:bg-muted"
              >
                <FileText className="h-4 w-4" />
                All materials
              </Link>
            </div>
            <div className="mt-3 grid gap-2">
              {studio.resources.alternateVideos.map((resource) => (
                <ResourceLink key={resource.lessonResourceId} resource={resource} />
              ))}
              {studio.resources.supporting.map((resource) => (
                <ResourceLink key={resource.lessonResourceId} resource={resource} />
              ))}
              {studio.resources.alternateVideos.length === 0 && studio.resources.supporting.length === 0 ? (
                <p className="text-sm text-muted-foreground">No supporting resources attached yet.</p>
              ) : null}
            </div>
          </section>
        </aside>
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

function ModeSection({
  lessonId,
  mode,
  rawContent,
  completed,
}: {
  lessonId: string
  mode: LessonModeKey
  rawContent: string | null
  completed: boolean
}) {
  const blocks = contentBlocks(rawContent)
  const available = Boolean(rawContent?.trim())
  return (
    <section id={`mode-${mode}`} className="rounded-lg border border-border bg-card p-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <BookOpen className="h-5 w-5 text-primary" />
          <h2 className="text-xl font-semibold tracking-normal capitalize">{mode}</h2>
        </div>
        <LessonModeCompletionButton
          lessonId={lessonId}
          mode={mode}
          completed={completed}
          available={available}
        />
      </div>

      {blocks.length > 0 ? (
        <div className="mt-5 grid gap-4">
          {blocks.map((block) => (
            <div key={block.title} className="lesson-prose">
              <h3 className="text-base font-semibold tracking-normal">{block.title}</h3>
              <div className="mt-2 grid gap-2 text-sm leading-6 text-muted-foreground">
                {block.items.map((item, index) => (
                  <p key={`${block.title}-${index}`}>{item}</p>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          This mode is waiting for reviewed lesson content.
        </p>
      )}
    </section>
  )
}

function ResourceSummary({
  resource,
  fallbackReason,
}: {
  resource: LessonStudioResource
  fallbackReason?: string | null
}) {
  return (
    <div className="min-w-0">
      <h2 className="truncate text-base font-semibold tracking-normal">{resource.title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        {resource.creator ?? resource.provider ?? 'Approved source'}
        {resource.durationSeconds ? ` / ${formatSeconds(resource.durationSeconds)}` : ''}
        {resource.language ? ` / ${resource.language.toUpperCase()}` : ''}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        Health: {resource.linkHealth}
        {resource.qualityScore !== null ? ` / quality ${resource.qualityScore}` : ''}
        {resource.lastMetadataCheckAt ? ` / checked ${formatDate(resource.lastMetadataCheckAt)}` : ''}
      </p>
      {fallbackReason ? (
        <p className="mt-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          {fallbackReason}
        </p>
      ) : null}
    </div>
  )
}

function ResourceLink({ resource }: { resource: LessonStudioResource }) {
  const body = (
    <>
      <p className="text-sm font-medium">{resource.title}</p>
      <p className="mt-1 text-xs text-muted-foreground capitalize">
        {resource.role.replace(/_/g, ' ')}
        {resource.coveragePercentage ? ` / ${resource.coveragePercentage}% coverage` : ''}
      </p>
    </>
  )

  if (!resource.url) {
    return <div className="rounded-md bg-muted p-3">{body}</div>
  }

  return (
    <a href={resource.url} target="_blank" rel="noreferrer" className="rounded-md bg-muted p-3 hover:bg-muted/70">
      {body}
    </a>
  )
}

function contentBlocks(rawContent: string | null): Array<{ title: string; items: string[] }> {
  if (!rawContent?.trim()) return []

  const parsed = parseJson(rawContent)
  if (!parsed || typeof parsed !== 'object') {
    return [{ title: 'Content', items: [rawContent.trim()] }]
  }

  if (Array.isArray(parsed)) {
    return [{ title: 'Content', items: parsed.map(valueToText).filter(Boolean) }]
  }

  return Object.entries(parsed)
    .map(([key, value]) => ({
      title: titleFromKey(key),
      items: Array.isArray(value) ? value.map(valueToText).filter(Boolean) : [valueToText(value)].filter(Boolean),
    }))
    .filter((block) => block.items.length > 0)
}

function parseJson(value: string): unknown | null {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(', ')
  if (typeof value === 'object') {
    return Object.entries(value)
      .map(([key, inner]) => `${titleFromKey(key)}: ${valueToText(inner)}`)
      .filter(Boolean)
      .join(' / ')
  }
  return ''
}

function titleFromKey(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (char) => char.toUpperCase())
}

function formatSeconds(seconds: number): string {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins}:${String(secs).padStart(2, '0')}`
}

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(date)
}

// ─── Manifest-based lesson fallback view ────────────────────────────────────

function ManifestLessonView({
  programmeCode,
  semesterNumber,
  subjectCode,
  lessonSlug,
  subject,
}: {
  programmeCode: string
  semesterNumber: number
  subjectCode: string
  lessonSlug: string
  subject: ManifestSubject
}) {
  const subjectHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`
  const semesterHref = `/learn/${programmeCode}/semester/${semesterNumber}`
  const primaryVideos = subject.resources.filter((r) => r.role === 'primary_video')
  const alternateVideos = subject.resources.filter((r) => r.role !== 'primary_video')
  const lessonNotes = generateLessonNotes(
    subject.name,
    subjectCode,
    subject.coverageFocus,
    subject.resources.map((r) => ({ title: r.title, channel: r.channel, url: r.url, role: r.role, description: r.description })),
  )

  // ─── V3 Interactive Notes lookup ─────────────────────────────────────────
  // Try to find rich notes for this subject. The subject code in the URL may
  // be the DCIOT variant — resolve to the COMP alternate code if applicable.
  const resolvedSubjectCode = programmeCode === 'DCIOT' && subject.alternateCode
    ? subject.alternateCode
    : subjectCode
  const subjectNotes = getSubjectNotes(resolvedSubjectCode)
  // Try to find the SPECIFIC lesson by slug — if found, render that lesson's
  // premium interactive notes; else fall back to the whole-subject accordion.
  const lessonMatch = subjectNotes ? findLessonBySlug(resolvedSubjectCode, lessonSlug) : null
  const { prev, next } = subjectNotes ? getAdjacentLessons(resolvedSubjectCode, lessonSlug) : { prev: null, next: null }
  const lessonBaseHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <RecentlyViewedTracker
        resourceType="lesson"
        resourceId={subjectCode}
        title={subject.name}
        href={`/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson/${lessonSlug}`}
      />
      {/* Breadcrumbs */}
      <section className="border-b border-border/70 bg-muted/30">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href={semesterHref} className="inline-flex items-center gap-1 font-medium hover:text-foreground">
              <ArrowLeft className="h-3 w-3" />
              Semester {semesterNumber}
            </Link>
            <span>/</span>
            <Link href={subjectHref} className="font-medium hover:text-foreground">
              {subjectCode}
            </Link>
          </div>
          <div className="mt-3 flex items-center gap-3">
              <h1 className="text-2xl font-bold tracking-normal sm:text-3xl">{subject.name}</h1>
              <BookmarkButton
                resourceType="lesson"
                resourceId={subjectCode}
                label={subject.name}
                size="sm"
              />
            </div>
          <p className="mt-1 text-sm text-muted-foreground">{subject.coverageFocus}</p>
        </div>
      </section>

      <div className="mx-auto max-w-7xl px-5 py-6 sm:px-6 lg:px-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
          {/* Main content: video player */}
          <div className="space-y-6">
            {primaryVideos.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <PlayCircle className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Primary Lecture</h2>
                </div>
                <YouTubePlayer
                  url={primaryVideos[0]!.url}
                  title={primaryVideos[0]!.title}
                  channel={primaryVideos[0]!.channel}
                  language={primaryVideos[0]!.language}
                  description={primaryVideos[0]!.description}
                  isPlaylist={!!primaryVideos[0]!.playlistId}
                />
              </div>
            )}

            {alternateVideos.length > 0 && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Video className="h-5 w-5 text-muted-foreground" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Alternate Lectures</h2>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
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
              </div>
            )}

            {/* Lesson overview */}
            <div className="rounded-lg border border-border bg-card p-5">
              <h2 className="text-lg font-semibold">Lesson Overview</h2>
              <p className="mt-2 text-sm text-muted-foreground">{subject.description}</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-2">
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Subject Code</p>
                  <p className="text-sm font-semibold">{subjectCode}</p>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Credits</p>
                  <p className="text-sm font-semibold">{subject.credits}</p>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Category</p>
                  <p className="text-sm font-semibold capitalize">{subject.category}</p>
                </div>
                <div className="rounded-md bg-muted px-3 py-2">
                  <p className="text-xs text-muted-foreground">Resources</p>
                  <p className="text-sm font-semibold">{subject.resources.length} video lectures</p>
                </div>
              </div>
            </div>

            {/* ─── V3 Interactive Notes (replaces generated text notes) ─── */}
            {subjectNotes && lessonMatch ? (
              <section className="rounded-lg border border-primary/30 bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Interactive Notes — {lessonMatch.lesson.title}</h2>
                </div>
                <InteractiveNotesRenderer
                  lesson={lessonMatch.lesson}
                  subject={subjectNotes}
                  prevHref={prev ? `${lessonBaseHref}/${prev.slug}` : null}
                  nextHref={next ? `${lessonBaseHref}/${next.slug}` : null}
                />
              </section>
            ) : subjectNotes ? (
              <section className="rounded-lg border border-primary/30 bg-card p-5">
                <div className="mb-3 flex items-center gap-2">
                  <FileText className="h-5 w-5 text-primary" aria-hidden="true" />
                  <h2 className="text-lg font-semibold">Study Notes — All Units</h2>
                </div>
                <p className="mb-4 text-sm text-muted-foreground">
                  Browse all units and lessons below. Click any lesson to open its full interactive notes.
                </p>
                <LessonNotesRenderer notes={subjectNotes} />
              </section>
            ) : (
              <div className="space-y-4">
                {lessonNotes.sections.map((section, i) => (
                  <div key={i} className="rounded-lg border border-border bg-card p-5">
                    <h2 className="text-lg font-semibold">{section.title}</h2>
                    <div className="mt-3 text-sm text-muted-foreground">
                      {section.content.split('\n').map((line, j) => (
                        <p key={j} className={line.startsWith('•') || /^\d+\./.test(line) ? 'mt-1' : 'mt-2'}>
                          {line || '\u00A0'}
                        </p>
                      ))}
                    </div>
                  </div>
                ))}
                <div className="rounded-lg border border-dashed border-border bg-background/50 p-4 text-center">
                  <FileText className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm font-medium">Detailed interactive notes coming soon for this subject</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    We&apos;re writing comprehensive V3 notes with diagrams, code examples, and quizzes.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Sidebar */}
          <aside className="space-y-4">
            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Study Tools</h3>
              <div className="mt-3 space-y-2">
                <Link href={`/tutor?subject=${subjectCode}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <MessageCircle className="h-4 w-4 text-primary" />
                  Ask LEO about this lesson
                </Link>
                <Link href={`/practice?subject=${subjectCode}`} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <ListChecks className="h-4 w-4 text-primary" />
                  Practice questions
                </Link>
                <Link href={subjectHref} className="flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition-colors">
                  <BookOpen className="h-4 w-4 text-primary" />
                  All subject resources
                </Link>
              </div>
            </div>

            <div className="rounded-lg border border-border bg-card p-4">
              <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Source</h3>
              <p className="mt-2 text-xs text-muted-foreground">
                YouTube lectures curated from the CWIT R23 YouTube Lecture Guide.
                Videos are public resources and are not an official endorsement by CWIT or MSBTE.
              </p>
              {subject.resources[0] && (
                <p className="mt-2 text-xs text-muted-foreground">
                  Source: {subject.resources[0].sourcePdf} · Page {subject.resources[0].sourcePage}
                </p>
              )}
            </div>
          </aside>
        </div>
      </div>
    </main>
  )
}
