import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code2,
  ExternalLink,
  FileText,
  LibraryBig,
  ListChecks,
  MessageCircle,
  PlayCircle,
  Sparkles,
  Target,
  Video,
  type LucideIcon,
} from 'lucide-react'
import {
  LESSON_MODE_KEYS,
  type LessonModeKey,
  type LessonStudio,
  type LessonStudioResource,
} from '@/features/learning/server/get-lesson-studio'
import { LessonModeCompletionButton } from '@/features/learning/components/lesson/lesson-mode-completion-button'
import { LessonVisitRecorder } from '@/features/learning/components/lesson/lesson-visit-recorder'
import { LessonVideoPlayer } from '@/features/learning/components/lesson/lesson-video-player'
import { InteractiveNotesRenderer } from '@/components/learning/interactive-notes-renderer'
import { LessonNotesRenderer } from '@/components/learning/lesson-notes-renderer'
import { BookmarkButton } from '@/components/learning/bookmark-button'
import { RecentlyViewedTracker } from '@/components/learning/recently-viewed-tracker'
import { findLessonBySlug, getAdjacentLessons, getSubjectNotes } from '@/lib/curriculum/lesson-notes-loader'

interface DbLessonStudioProps {
  studio: LessonStudio
  lessonSlug: string
}

export function DbLessonStudio({ studio, lessonSlug }: DbLessonStudioProps) {
  const subjectHref = `/learn/${studio.programme.code}/semester/${studio.semester.number}/subject/${studio.subject.code}`
  const unitHref = `${subjectHref}/unit/${studio.unit.number}`
  const query = new URLSearchParams({
    subjectId: studio.subject.id,
    unitNumber: String(studio.unit.number),
    lessonId: studio.lesson.id,
    ...(studio.topic ? { topicId: studio.topic.id } : {}),
  })
  const tutorHref = `/tutor?${query.toString()}`
  const practiceHref = `/practice?${query.toString()}`
  const materialsHref = `/materials?lessonId=${encodeURIComponent(studio.lesson.id)}`
  const notebookHref = `/notebook?${new URLSearchParams({
    subject: studio.subject.code,
    lesson: studio.lesson.title,
  }).toString()}`
  const codingHref = `/coding?${new URLSearchParams({
    subject: studio.subject.code,
    lessonId: studio.lesson.id,
  }).toString()}`
  const primaryProgress = studio.resources.primaryVideo
    ? studio.videoProgress.find((item) => item.resourceId === studio.resources.primaryVideo?.id)
    : null
  const notes = getSubjectNotes(studio.subject.code)
  const notesMatch = notes ? findLessonBySlug(studio.subject.code, lessonSlug) : null
  const adjacent = notes ? getAdjacentLessons(studio.subject.code, lessonSlug) : { prev: null, next: null }
  const notesBaseHref = `/learn/${studio.programme.code}/semester/${studio.semester.number}/subject/${studio.subject.code}/lesson`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <LessonVisitRecorder lessonId={studio.lesson.id} />
      <RecentlyViewedTracker
        resourceType="lesson"
        resourceId={studio.lesson.id}
        title={studio.lesson.title}
        href={studio.canonicalPath}
      />

      <section className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/learn" className="font-semibold hover:text-foreground">Learning OS</Link>
            <span>/</span>
            <Link href={subjectHref} className="inline-flex items-center gap-1 font-semibold hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {studio.subject.code}</Link>
            <span>/</span>
            <Link href={unitHref} className="font-semibold hover:text-foreground">Unit {studio.unit.number}</Link>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-primary">Lesson {studio.lesson.order}</span>
                {studio.topic && <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{studio.topic.title}</span>}
              </div>
              <div className="mt-3 flex items-start gap-3">
                <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{studio.lesson.title}</h1>
                <BookmarkButton resourceType="lesson" resourceId={studio.lesson.id} label={studio.lesson.title} size="sm" />
              </div>
              <p className="mt-3 text-sm leading-6 text-muted-foreground sm:text-base">{studio.subject.name} · {studio.unit.title}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"><Sparkles className="h-4 w-4" /> Ask LEO about this lesson</Link>
                <Link href={practiceHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><ListChecks className="h-4 w-4" /> Practise</Link>
                <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><FileText className="h-4 w-4" /> Detailed notes</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
              <Metric icon={Clock3} label="Minutes" value={studio.lesson.durationMin} />
              <Metric icon={CheckCircle2} label="Modes" value={`${studio.completion.completedModeCount}/${studio.completion.totalModeCount}`} />
              <Metric icon={Target} label="Progress" value={`${studio.completion.percent}%`} />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_minmax(0,1fr)_300px] lg:px-8">
        <aside className="order-2 rounded-3xl border border-border bg-card p-4 lg:order-1 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Subject map</p>
          <h2 className="mt-1 font-black">Lessons</h2>
          <div className="mt-4 space-y-4">
            {studio.navigation.units.map((unit) => (
              <div key={unit.id}>
                <p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Unit {unit.number}</p>
                <p className="mt-1 text-sm font-bold">{unit.title}</p>
                <div className="mt-2 space-y-1">
                  {unit.lessons.map((lesson) => (
                    <Link key={lesson.id} href={lesson.href} className={`block rounded-xl px-3 py-2.5 text-sm transition ${lesson.isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'}`}>
                      <span className="block font-bold">{lesson.title}</span>
                      <span className={lesson.isActive ? 'text-primary-foreground/75' : 'text-muted-foreground'}>{lesson.durationMin} min{lesson.topicTitle ? ` · ${lesson.topicTitle}` : ''}</span>
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </aside>

        <div className="order-1 space-y-6 lg:order-2">
          <section className="overflow-hidden rounded-3xl border border-border bg-card">
            {studio.resources.primaryVideo?.embedUrl ? (
              <LessonVideoPlayer
                lessonId={studio.lesson.id}
                resourceId={studio.resources.primaryVideo.id}
                title={studio.resources.primaryVideo.title}
                embedUrl={studio.resources.primaryVideo.embedUrl}
                chapters={studio.resources.primaryVideo.chapters}
                initialLastSecond={primaryProgress?.lastSecond ?? 0}
              />
            ) : (
              <VideoFallback pendingReview={studio.resources.pendingCurricularReview} tutorHref={tutorHref} />
            )}
            {studio.resources.primaryVideo && <div className="border-t border-border p-4 sm:p-5"><ResourceSummary resource={studio.resources.primaryVideo} reason={studio.resources.primaryVideoFallbackReason} /></div>}
          </section>

          <section className="rounded-3xl border border-border bg-card p-4 sm:p-5">
            <div className="flex flex-wrap gap-2">
              {studio.lesson.modes.map((mode) => <a key={mode.key} href={`#mode-${mode.key}`} className={`inline-flex min-h-10 items-center gap-2 rounded-xl border px-3 text-sm font-bold ${mode.completed ? 'border-primary bg-primary text-primary-foreground' : 'border-border hover:bg-accent'}`}>{mode.completed ? <CheckCircle2 className="h-4 w-4" /> : <BookOpen className="h-4 w-4" />}{mode.label}</a>)}
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

          {notes && (
            <section className="rounded-3xl border border-primary/25 bg-card p-5 sm:p-6">
              <div className="mb-5 flex items-center gap-3"><span className="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10 text-primary"><BookOpen className="h-5 w-5" /></span><div><p className="text-xs font-black uppercase tracking-wide text-primary">Learn summary</p><h2 className="text-xl font-black">Interactive lesson notes</h2></div></div>
              {notesMatch ? (
                <InteractiveNotesRenderer
                  lesson={notesMatch.lesson}
                  subject={notes}
                  prevHref={adjacent.prev ? `${notesBaseHref}/${adjacent.prev.slug}` : null}
                  nextHref={adjacent.next ? `${notesBaseHref}/${adjacent.next.slug}` : null}
                />
              ) : <LessonNotesRenderer notes={notes} />}
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {studio.navigation.previousLesson && <Link href={studio.navigation.previousLesson.href} className="rounded-2xl border border-border bg-card p-4 hover:bg-accent"><p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Previous lesson</p><p className="mt-1 font-black">{studio.navigation.previousLesson.title}</p></Link>}
            {studio.navigation.nextLesson && <Link href={studio.navigation.nextLesson.href} className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-right hover:bg-primary/10"><p className="text-xs font-black uppercase tracking-wide text-primary">Next lesson</p><p className="mt-1 font-black">{studio.navigation.nextLesson.title}</p></Link>}
          </div>
        </div>

        <aside className="order-3 space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <section className="rounded-3xl border border-border bg-card p-5">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Completion</p>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{ width: `${studio.completion.percent}%` }} /></div>
            <div className="mt-4 space-y-2">{studio.lesson.modes.map((mode) => <div key={mode.key} className="flex items-center justify-between text-sm"><span className="font-semibold">{mode.label}</span><span className={mode.completed ? 'font-bold text-primary' : 'text-muted-foreground'}>{mode.completed ? 'Done' : `${Math.round(mode.progress)}%`}</span></div>)}</div>
          </section>

          <ToolCard icon={MessageCircle} title="Ask LEO" description="Tutor context includes this subject, unit and lesson." href={tutorHref} label="Open Tutor" primary />
          <ToolCard icon={ListChecks} title="Practice" description="Answer questions connected to this lesson and review mistakes." href={practiceHref} label="Start practice" />
          <ToolCard icon={LibraryBig} title="Notebook" description="Save concepts, formulas and mistakes from this lesson." href={notebookHref} label="Open notebook" />
          <ToolCard icon={Code2} title="Apply" description="Open Coding Lab with lesson context where implementation is relevant." href={codingHref} label="Open Coding Lab" />

          {(studio.resources.alternateVideos.length > 0 || studio.resources.supporting.length > 0 || studio.resources.notes.length > 0) && (
            <section className="rounded-3xl border border-border bg-card p-5">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Supporting resources</p>
              <div className="mt-3 space-y-2">{[...studio.resources.alternateVideos, ...studio.resources.notes, ...studio.resources.supporting].map((resource) => <ResourceLink key={resource.lessonResourceId} resource={resource} />)}</div>
            </section>
          )}
        </aside>
      </section>
    </main>
  )
}

function ModeSection({ lessonId, mode, rawContent, completed }: { lessonId: string; mode: LessonModeKey; rawContent: string | null; completed: boolean }) {
  const blocks = contentBlocks(rawContent)
  const available = Boolean(rawContent?.trim())
  return (
    <section id={`mode-${mode}`} className="scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wide text-primary">Lesson mode</p><h2 className="mt-1 text-2xl font-black capitalize">{mode}</h2></div><LessonModeCompletionButton lessonId={lessonId} mode={mode} completed={completed} available={available} /></div>
      {blocks.length ? <div className="mt-5 space-y-5">{blocks.map((block) => <div key={block.title} className="lesson-prose"><h3 className="text-lg font-black">{block.title}</h3><div className="mt-2 space-y-2 text-sm leading-7 text-muted-foreground">{block.items.map((item, index) => <p key={`${block.title}-${index}`}>{item}</p>)}</div></div>)}</div> : <p className="mt-4 text-sm text-muted-foreground">This mode has no published content yet. Use the interactive notes or ask LEO instead.</p>}
    </section>
  )
}

function VideoFallback({ pendingReview, tutorHref }: { pendingReview: boolean; tutorHref: string }) {
  return <div className="grid aspect-video place-items-center bg-muted px-6 text-center"><div><Video className={`mx-auto h-9 w-9 ${pendingReview ? 'text-amber-500' : 'text-muted-foreground'}`} /><h2 className="mt-3 text-xl font-black">{pendingReview ? 'Lesson video is under review' : 'No verified lesson video yet'}</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Lernio will not show a random subject playlist here. Continue with the lesson notes, practice and context-aware Tutor.</p><Link href={tutorHref} className="mt-4 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><BrainCircuit className="h-4 w-4" /> Explain this lesson</Link></div></div>
}

function ToolCard({ icon: Icon, title, description, href, label, primary = false }: { icon: LucideIcon; title: string; description: string; href: string; label: string; primary?: boolean }) {
  return <section className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="font-black">{title}</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><Link href={href} className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold ${primary ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}>{label}<ArrowRight className="h-4 w-4" /></Link></section>
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return <div className="rounded-2xl border border-border bg-background/85 p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-black">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
}

function ResourceSummary({ resource, reason }: { resource: LessonStudioResource; reason: string | null }) {
  return <div><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h2 className="font-black">{resource.title}</h2><p className="mt-1 text-sm text-muted-foreground">{resource.creator ?? resource.provider ?? 'Approved source'}{resource.language ? ` · ${resource.language.toUpperCase()}` : ''}</p><p className="mt-1 text-xs text-muted-foreground">Link health: {resource.linkHealth}{resource.coveragePercentage ? ` · ${resource.coveragePercentage}% lesson coverage` : ''}</p></div>{resource.url && <a href={resource.url} target="_blank" rel="noopener noreferrer" className="inline-flex min-h-10 items-center justify-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent"><ExternalLink className="h-4 w-4" /> Source</a>}</div>{reason && <p className="mt-3 rounded-xl border border-amber-500/25 bg-amber-500/10 p-3 text-xs leading-5 text-amber-800 dark:text-amber-200">{reason}</p>}</div>
}

function ResourceLink({ resource }: { resource: LessonStudioResource }) {
  if (!resource.url) return <div className="rounded-xl bg-muted p-3"><p className="text-sm font-bold">{resource.title}</p><p className="text-xs capitalize text-muted-foreground">{resource.role.replace(/_/g, ' ')}</p></div>
  return <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block rounded-xl border border-border p-3 hover:bg-accent"><p className="text-sm font-bold">{resource.title}</p><p className="mt-1 text-xs capitalize text-muted-foreground">{resource.role.replace(/_/g, ' ')}</p></a>
}

function contentBlocks(rawContent: string | null): Array<{ title: string; items: string[] }> {
  if (!rawContent?.trim()) return []
  try {
    const parsed: unknown = JSON.parse(rawContent)
    if (Array.isArray(parsed)) return [{ title: 'Content', items: parsed.map(valueToText).filter(Boolean) }]
    if (parsed && typeof parsed === 'object') return Object.entries(parsed).map(([key, value]) => ({ title: titleFromKey(key), items: Array.isArray(value) ? value.map(valueToText).filter(Boolean) : [valueToText(value)].filter(Boolean) })).filter((block) => block.items.length > 0)
  } catch {
    // Plain reviewed text is valid lesson content.
  }
  return [{ title: 'Content', items: [rawContent.trim()] }]
}

function valueToText(value: unknown): string {
  if (value === null || value === undefined) return ''
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return String(value)
  if (Array.isArray(value)) return value.map(valueToText).filter(Boolean).join(', ')
  if (typeof value === 'object') return Object.entries(value).map(([key, inner]) => `${titleFromKey(key)}: ${valueToText(inner)}`).filter(Boolean).join(' · ')
  return ''
}

function titleFromKey(key: string) {
  return key.replace(/([a-z])([A-Z])/g, '$1 $2').replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase())
}
