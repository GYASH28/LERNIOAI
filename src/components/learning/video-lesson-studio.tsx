import Link from 'next/link'
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  FileText,
  ListChecks,
  NotebookPen,
  Play,
  Sparkles,
  Target,
  Video,
} from 'lucide-react'
import type { ManifestSubject } from '@/lib/curriculum/manifest-data'
import { buildVideoLearningCatalog } from '@/lib/curriculum/video-learning-catalog'
import { normalizeLessonSlug } from '@/lib/curriculum/lesson-notes-loader'
import { YouTubePlayer } from '@/components/learning/youtube-player-lazy'
import { BookmarkButton } from '@/components/learning/bookmark-button'
import { RecentlyViewedTracker } from '@/components/learning/recently-viewed-tracker'
import { cn } from '@/lib/utils'

interface VideoLessonStudioProps {
  programmeCode: string
  semesterNumber: number
  subjectCode: string
  lessonSlug: string
  subject: ManifestSubject
}

export function VideoLessonStudio({
  programmeCode,
  semesterNumber,
  subjectCode,
  lessonSlug,
  subject,
}: VideoLessonStudioProps) {
  const catalog = buildVideoLearningCatalog(programmeCode, subject)
  const requested = normalizeLessonSlug(lessonSlug)
  const topic = catalog.topics.find((item) =>
    item.slug === lessonSlug || normalizeLessonSlug(item.slug) === requested,
  )
  const subjectHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`
  const semesterHref = `/learn/${programmeCode}/semester/${semesterNumber}`

  if (!topic) {
    return (
      <main className="grid min-h-[70vh] place-items-center bg-background px-4 text-center">
        <div className="max-w-lg rounded-3xl border border-border bg-card p-7 shadow-sm">
          <AlertTriangle className="mx-auto h-9 w-9 text-amber-500" />
          <h1 className="mt-4 text-2xl font-black">This video lesson does not exist</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            The saved link may belong to an older curriculum version. Open the subject to choose a current mapped video lesson.
          </p>
          <Link href={subjectHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
            <ArrowLeft className="h-4 w-4" /> Back to subject
          </Link>
        </div>
      </main>
    )
  }

  if (!topic.video) {
    const materialsHref = `/materials?${new URLSearchParams({
      subject: catalog.resolvedSubjectCode,
      lesson: topic.slug,
    }).toString()}`
    const tutorHref = `/tutor?${new URLSearchParams({
      subject: catalog.resolvedSubjectCode,
      lesson: topic.title,
      unitNumber: String(topic.unitNumber),
      prompt: `Teach me ${topic.title} clearly because a reviewed video is not available yet.`,
    }).toString()}`

    return (
      <main className="grid min-h-[70vh] place-items-center bg-background px-4 text-center">
        <div className="max-w-xl rounded-3xl border border-amber-500/25 bg-card p-7 shadow-sm">
          <Video className="mx-auto h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-xs font-black uppercase tracking-[0.14em] text-amber-700">Curriculum topic · not a video lesson</p>
          <h1 className="mt-2 text-2xl font-black">{topic.title}</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            This topic has written material, but no reviewed direct video yet. Lernio will not reuse a random playlist and pretend it is a lesson.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-2">
            <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">
              <BookOpen className="h-4 w-4" /> Read the notes
            </Link>
            <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold">
              <BrainCircuit className="h-4 w-4" /> Learn with LEO
            </Link>
            <Link href={subjectHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold">
              <ArrowLeft className="h-4 w-4" /> Subject videos
            </Link>
          </div>
        </div>
      </main>
    )
  }

  const video = topic.video
  const lessonIndex = catalog.videoLessons.findIndex((item) => item.slug === topic.slug)
  const previous = lessonIndex > 0 ? catalog.videoLessons[lessonIndex - 1] : null
  const next = lessonIndex >= 0 && lessonIndex < catalog.videoLessons.length - 1
    ? catalog.videoLessons[lessonIndex + 1]
    : null
  const lessonBaseHref = `${subjectHref}/lesson`
  const currentHref = `${lessonBaseHref}/${topic.slug}`
  const materialsHref = `/materials?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.slug,
  }).toString()}`
  const tutorHref = `/tutor?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.title,
    unitNumber: String(topic.unitNumber),
  }).toString()}`
  const explainHref = `/tutor?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.title,
    unitNumber: String(topic.unitNumber),
    prompt: `Explain ${topic.title} more simply with one practical example.`,
  }).toString()}`
  const summaryHref = `/tutor?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.title,
    unitNumber: String(topic.unitNumber),
    prompt: `Create concise revision notes from the lesson ${topic.title}.`,
  }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.title,
    unitNumber: String(topic.unitNumber),
  }).toString()}`
  const notebookHref = `/notebook?${new URLSearchParams({
    subject: catalog.resolvedSubjectCode,
    lesson: topic.title,
  }).toString()}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <RecentlyViewedTracker
        resourceType="lesson"
        resourceId={`${catalog.resolvedSubjectCode}:${topic.slug}`}
        title={topic.title}
        href={currentHref}
      />

      <section className="border-b border-border/70 bg-background">
        <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground sm:text-sm">
            <Link href="/learn" className="font-semibold hover:text-foreground">Learn</Link>
            <span>/</span>
            <Link href={semesterHref} className="font-semibold hover:text-foreground">Semester {semesterNumber}</Link>
            <span>/</span>
            <Link href={subjectHref} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> {catalog.resolvedSubjectCode}
            </Link>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-5 sm:px-6 sm:py-7 lg:grid-cols-[minmax(0,1fr)_330px] lg:px-8">
        <div className="min-w-0 space-y-5">
          <section className="overflow-hidden rounded-3xl border border-border bg-card shadow-sm">
            <YouTubePlayer
              url={video.url}
              title={`${topic.title} — ${video.resource.title}`}
              channel={video.resource.channel}
              language={video.resource.language}
              description={video.resource.description}
              isPlaylist={false}
            />

            <div className="p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="rounded-full bg-primary/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wide text-primary">Video lesson {lessonIndex + 1}</span>
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[10px] font-bold text-muted-foreground">Unit {topic.unitNumber}</span>
                    <span className="rounded-full bg-emerald-500/10 px-2.5 py-1 text-[10px] font-bold text-emerald-700">Direct video</span>
                  </div>
                  <h1 className="mt-3 text-2xl font-black tracking-tight sm:text-4xl">{topic.title}</h1>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{topic.overview}</p>
                </div>
                <BookmarkButton
                  resourceType="lesson"
                  resourceId={`${catalog.resolvedSubjectCode}:${topic.slug}`}
                  label={topic.title}
                  size="sm"
                />
              </div>

              <div className="mt-4 flex flex-wrap gap-2 text-xs font-semibold text-muted-foreground">
                <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2.5 py-1.5"><Clock3 className="h-3.5 w-3.5" /> {topic.durationMin} min study</span>
                <span className="rounded-full bg-muted px-2.5 py-1.5">{video.resource.channel}</span>
                <span className="rounded-full bg-muted px-2.5 py-1.5 uppercase">{video.resource.language}</span>
              </div>
            </div>
          </section>

          <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <ActionCard href={explainHref} icon={BrainCircuit} title="Explain simply" helper="Open LEO with this lesson attached." primary />
            <ActionCard href={summaryHref} icon={Sparkles} title="Create revision" helper="Turn the lesson into short notes." />
            <ActionCard href={practiceHref} icon={ListChecks} title="Practice" helper="Check whether you understood it." />
            <ActionCard href={materialsHref} icon={FileText} title="Written notes" helper="Read the complete Materials version." />
          </section>

          <section className="grid gap-4 lg:grid-cols-2">
            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2"><Target className="h-5 w-5 text-primary" /><h2 className="text-xl font-black">What to learn from this video</h2></div>
              <div className="mt-4 space-y-3">
                {(topic.objectives.length > 0 ? topic.objectives : topic.keyConcepts).slice(0, 7).map((objective) => (
                  <div key={objective} className="flex gap-3 rounded-2xl border border-border bg-background p-3">
                    <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                    <p className="text-sm leading-6 text-muted-foreground">{objective}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <div className="flex items-center gap-2"><BrainCircuit className="h-5 w-5 text-primary" /><h2 className="text-xl font-black">Use LEO while watching</h2></div>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Pause the video, note the confusing timestamp, and ask a specific question. LEO receives this subject and lesson automatically.</p>
              <div className="mt-4 space-y-2">
                <TutorPrompt href={tutorHref} text="I did not understand one step in this lesson." />
                <TutorPrompt href={`/tutor?${new URLSearchParams({ subject: catalog.resolvedSubjectCode, lesson: topic.title, unitNumber: String(topic.unitNumber), prompt: `Give me three practical examples of ${topic.title}.` }).toString()}`} text="Show practical examples" />
                <TutorPrompt href={`/tutor?${new URLSearchParams({ subject: catalog.resolvedSubjectCode, lesson: topic.title, unitNumber: String(topic.unitNumber), prompt: `Quiz me one question at a time on ${topic.title}.` }).toString()}`} text="Quiz me on this lesson" />
              </div>
              <Link href={notebookHref} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent">
                <NotebookPen className="h-4 w-4" /> Save a doubt or timestamp
              </Link>
            </div>
          </section>

          <div className="grid gap-3 sm:grid-cols-2">
            {previous ? (
              <Link href={`${lessonBaseHref}/${previous.slug}`} className="rounded-2xl border border-border bg-card p-4 transition hover:bg-accent">
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Previous video lesson</p>
                <p className="mt-1 font-black">{previous.title}</p>
              </Link>
            ) : <div />}
            {next ? (
              <Link href={`${lessonBaseHref}/${next.slug}`} className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-right transition hover:bg-primary/10">
                <p className="text-xs font-black uppercase tracking-wide text-primary">Next video lesson</p>
                <p className="mt-1 font-black">{next.title}</p>
              </Link>
            ) : null}
          </div>
        </div>

        <aside className="min-w-0 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto lg:pr-1">
          <section className="overflow-hidden rounded-3xl border border-border bg-card">
            <div className="border-b border-border p-4">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">Subject queue</p>
              <h2 className="mt-1 font-black">{catalog.videoLessons.length} video lessons</h2>
            </div>
            <div className="max-h-[520px] space-y-1 overflow-y-auto p-2">
              {catalog.videoLessons.map((lesson, index) => {
                const active = lesson.slug === topic.slug
                return (
                  <Link
                    key={lesson.slug}
                    href={`${lessonBaseHref}/${lesson.slug}`}
                    className={cn(
                      'flex items-start gap-3 rounded-2xl border p-3 transition',
                      active ? 'border-primary/30 bg-primary/8' : 'border-transparent hover:border-border hover:bg-muted/40',
                    )}
                  >
                    <span className={cn('grid h-8 w-8 shrink-0 place-items-center rounded-xl text-xs font-black', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                      {active ? <Play className="h-3.5 w-3.5 fill-current" /> : index + 1}
                    </span>
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-sm font-bold leading-5">{lesson.title}</span>
                      <span className="mt-1 block text-[11px] text-muted-foreground">Unit {lesson.unitNumber} · {lesson.video?.resource.channel}</span>
                    </span>
                  </Link>
                )
              })}
            </div>
          </section>

          <section className="rounded-3xl border border-border bg-card p-4">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-primary">After watching</p>
            <div className="mt-3 grid gap-2">
              <Link href={practiceHref} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent">Practice lesson <ArrowRight className="h-4 w-4" /></Link>
              <Link href={materialsHref} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent">Read detailed notes <ArrowRight className="h-4 w-4" /></Link>
              <Link href={tutorHref} className="inline-flex min-h-11 items-center justify-between rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent">Ask LEO <ArrowRight className="h-4 w-4" /></Link>
            </div>
          </section>
        </aside>
      </div>
    </main>
  )
}

function ActionCard({
  href,
  icon: Icon,
  title,
  helper,
  primary = false,
}: {
  href: string
  icon: typeof BrainCircuit
  title: string
  helper: string
  primary?: boolean
}) {
  return (
    <Link href={href} className={cn('rounded-2xl border p-4 transition hover:-translate-y-0.5 hover:shadow-sm', primary ? 'border-primary/30 bg-primary/8' : 'border-border bg-card hover:border-primary/30')}>
      <Icon className="h-5 w-5 text-primary" />
      <h2 className="mt-3 text-sm font-black">{title}</h2>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{helper}</p>
    </Link>
  )
}

function TutorPrompt({ href, text }: { href: string; text: string }) {
  return (
    <Link href={href} className="flex min-h-11 items-center justify-between gap-3 rounded-xl border border-border bg-background px-3 text-sm font-semibold transition hover:border-primary/35 hover:bg-primary/5">
      <span>{text}</span><ArrowRight className="h-4 w-4 shrink-0 text-primary" />
    </Link>
  )
}
