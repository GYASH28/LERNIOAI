import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  GraduationCap,
  LibraryBig,
  ListChecks,
  PlayCircle,
  Sparkles,
  Target,
  Video,
  type LucideIcon,
} from 'lucide-react'
import type { ManifestSubject } from '@/lib/curriculum/manifest-data'
import { enhanceSubject, type ManifestLesson } from '@/lib/curriculum/enhanced-manifest'
import {
  findLessonBySlug,
  getAdjacentLessons,
  getSubjectNotes,
  type Lesson,
  type SubjectNotes,
} from '@/lib/curriculum/lesson-notes-loader'
import { resolveManifestLessonVideo } from '@/lib/curriculum/lesson-video-resolver'
import { YouTubePlayer } from '@/components/learning/youtube-player-lazy'
import { InteractiveNotesRenderer } from '@/components/learning/interactive-notes-renderer'
import { BookmarkButton } from '@/components/learning/bookmark-button'
import { RecentlyViewedTracker } from '@/components/learning/recently-viewed-tracker'

interface ManifestLessonStudioProps {
  programmeCode: string
  semesterNumber: number
  subjectCode: string
  lessonSlug: string
  subject: ManifestSubject
}

interface ResolvedManifestLesson {
  lesson: Lesson
  unitNumber: number
  unitTitle: string
  unitWeightage: number
  subjectNotes: SubjectNotes | null
}

export function ManifestLessonStudio({
  programmeCode,
  semesterNumber,
  subjectCode,
  lessonSlug,
  subject,
}: ManifestLessonStudioProps) {
  const resolvedSubjectCode = programmeCode === 'DCIOT' && subject.alternateCode
    ? subject.alternateCode
    : subjectCode
  const notes = getSubjectNotes(resolvedSubjectCode) ?? getSubjectNotes(subject.code)
  const enhanced = enhanceSubject(subject)
  const allLessons = notes
    ? notes.units.flatMap((unit) => unit.lessons)
    : enhanced.units.flatMap((unit) => unit.lessons.map(toResolverLesson))
  const resolved = resolveLesson(notes, enhanced.units, lessonSlug)
  if (!resolved) return <MissingLesson subjectHref={`/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`} />

  const video = resolveManifestLessonVideo(subject, allLessons, resolved.lesson.slug)
  const adjacent = notes
    ? getAdjacentLessons(resolvedSubjectCode, resolved.lesson.slug)
    : syntheticAdjacent(enhanced.units.flatMap((unit) => unit.lessons), resolved.lesson.slug)
  const lessonBaseHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}/lesson`
  const subjectHref = `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`
  const semesterHref = `/learn/${programmeCode}/semester/${semesterNumber}`
  const tutorHref = `/tutor?${new URLSearchParams({
    subject: resolvedSubjectCode,
    lesson: resolved.lesson.title,
    unitNumber: String(resolved.unitNumber),
  }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({
    subject: resolvedSubjectCode,
    lesson: resolved.lesson.title,
    unitNumber: String(resolved.unitNumber),
  }).toString()}`
  const materialsHref = `/materials?${new URLSearchParams({
    subject: resolvedSubjectCode,
    lesson: resolved.lesson.slug,
  }).toString()}`
  const notebookHref = `/notebook?${new URLSearchParams({
    subject: resolvedSubjectCode,
    lesson: resolved.lesson.title,
  }).toString()}`
  const currentHref = `${lessonBaseHref}/${resolved.lesson.slug}`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <RecentlyViewedTracker
        resourceType="lesson"
        resourceId={`${resolvedSubjectCode}:${resolved.lesson.slug}`}
        title={resolved.lesson.title}
        href={currentHref}
      />

      <section className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/learn" className="font-semibold hover:text-foreground">Learning OS</Link>
            <span>/</span>
            <Link href={semesterHref} className="font-semibold hover:text-foreground">Semester {semesterNumber}</Link>
            <span>/</span>
            <Link href={subjectHref} className="inline-flex items-center gap-1 font-semibold hover:text-foreground"><ArrowLeft className="h-4 w-4" /> {resolvedSubjectCode}</Link>
          </div>

          <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-primary">Unit {resolved.unitNumber}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold text-muted-foreground">{resolved.unitTitle}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold capitalize text-muted-foreground">{resolved.lesson.difficulty}</span>
              </div>
              <div className="mt-3 flex items-start gap-3">
                <h1 className="max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{resolved.lesson.title}</h1>
                <BookmarkButton resourceType="lesson" resourceId={`${resolvedSubjectCode}:${resolved.lesson.slug}`} label={resolved.lesson.title} size="sm" />
              </div>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{resolved.lesson.overview}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"><Sparkles className="h-4 w-4" /> Ask LEO</Link>
                <Link href={practiceHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><ListChecks className="h-4 w-4" /> Practice lesson</Link>
                <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><FileText className="h-4 w-4" /> Detailed Materials</Link>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3 lg:min-w-[420px]">
              <Metric icon={Clock3} label="Duration" value={`${resolved.lesson.durationMin}m`} />
              <Metric icon={GraduationCap} label="Unit weight" value={`${resolved.unitWeightage}%`} />
              <Metric icon={Video} label="Video" value={video ? '1 exact' : 'Notes'} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto grid max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[minmax(0,1fr)_310px] lg:px-8">
        <div className="space-y-6">
          <section className="overflow-hidden rounded-3xl border border-border bg-card">
            {video ? (
              <>
                <YouTubePlayer
                  url={video.url}
                  title={`${resolved.lesson.title} — ${video.resource.title}`}
                  channel={video.resource.channel}
                  language={video.resource.language}
                  description={video.resource.description}
                  isPlaylist={false}
                />
                <div className="border-t border-border p-4 sm:p-5">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-wide text-primary">Lesson-specific video</p>
                      <h2 className="mt-1 font-black">{video.resource.title}</h2>
                      <p className="mt-1 text-sm text-muted-foreground">{video.resource.channel} · {video.resource.language.toUpperCase()}</p>
                      <p className="mt-2 text-xs leading-5 text-muted-foreground">Mapping: {mappingLabel(video.mappingReason)}. This direct video is reserved for this lesson and is not reused as a playlist player.</p>
                    </div>
                    <span className="rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-bold text-emerald-700">Single video · no playlist</span>
                  </div>
                </div>
              </>
            ) : (
              <div className="grid min-h-[360px] place-items-center bg-muted/50 px-6 py-10 text-center">
                <div>
                  <Video className="mx-auto h-10 w-10 text-muted-foreground" />
                  <h2 className="mt-4 text-2xl font-black">No direct video mapped yet</h2>
                  <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">Lernio will not place a whole subject playlist or duplicate another lesson’s video here. Use the structured notes, practice and Tutor until a suitable direct video is reviewed.</p>
                  <Link href={tutorHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><BrainCircuit className="h-4 w-4" /> Teach this lesson differently</Link>
                </div>
              </div>
            )}
          </section>

          <section className="grid gap-4 sm:grid-cols-2">
            <LessonCard icon={Target} title="What you will learn" items={(resolved.lesson.objectives ?? resolved.lesson.keyConcepts).slice(0, 6)} empty="Understand and apply the core ideas in this lesson." />
            <LessonCard icon={CheckCircle2} title="Key concepts" items={resolved.lesson.keyConcepts.slice(0, 8)} empty={resolved.lesson.overview} />
          </section>

          {resolved.lesson.theory && (
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Understand</p>
              <h2 className="mt-1 text-2xl font-black">Complete explanation</h2>
              <div className="mt-4 whitespace-pre-wrap text-sm leading-7 text-muted-foreground">{resolved.lesson.theory}</div>
            </section>
          )}

          {resolved.lesson.workedExamples?.length ? (
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Apply</p>
              <h2 className="mt-1 text-2xl font-black">Worked examples</h2>
              <div className="mt-5 space-y-4">{resolved.lesson.workedExamples.map((example, index) => <article key={`${example.title}-${index}`} className="rounded-2xl border border-border bg-background p-4"><h3 className="font-black">{example.title}</h3><p className="mt-2 text-sm leading-6"><strong>Problem:</strong> {example.problem}</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground"><strong>Solution:</strong> {example.solution}</p>{example.explanation && <p className="mt-2 text-sm leading-6 text-muted-foreground">{example.explanation}</p>}</article>)}</div>
            </section>
          ) : null}

          {resolved.lesson.codeExamples.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Code walkthrough</p>
              <h2 className="mt-1 text-2xl font-black">Read, predict, then run</h2>
              <div className="mt-5 space-y-4">{resolved.lesson.codeExamples.map((example, index) => <article key={`${example.title}-${index}`} className="overflow-hidden rounded-2xl border border-border"><div className="flex items-center justify-between bg-muted/60 px-4 py-3"><h3 className="font-black">{example.title}</h3><span className="text-xs font-bold uppercase text-muted-foreground">{example.language}</span></div><pre className="overflow-x-auto bg-zinc-950 p-4 text-sm leading-6 text-zinc-100"><code>{example.code}</code></pre><p className="p-4 text-sm leading-6 text-muted-foreground">{example.explanation}</p></article>)}</div>
            </section>
          )}

          {resolved.subjectNotes && (
            <section className="rounded-3xl border border-primary/25 bg-card p-5 sm:p-6">
              <div className="mb-5"><p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Learn summary</p><h2 className="mt-1 text-2xl font-black">Interactive lesson notes</h2><p className="mt-1 text-sm text-muted-foreground">Concise study and revision tools stay here; full textbook notes remain in Materials.</p></div>
              <InteractiveNotesRenderer
                lesson={resolved.lesson}
                subject={resolved.subjectNotes}
                prevHref={adjacent.prev ? `${lessonBaseHref}/${adjacent.prev.slug}` : null}
                nextHref={adjacent.next ? `${lessonBaseHref}/${adjacent.next.slug}` : null}
              />
            </section>
          )}

          <section className="grid gap-4 sm:grid-cols-2">
            <LessonCard icon={Target} title="Common mistakes" items={resolved.lesson.commonMistakes.slice(0, 6)} empty="Record your mistakes in the Notebook after practice." tone="warning" />
            <LessonCard icon={GraduationCap} title="Exam tips" items={resolved.lesson.examTips.slice(0, 6)} empty="Focus on definitions, diagrams, steps and applications." />
          </section>

          {resolved.lesson.practiceQuestions.length > 0 && (
            <section className="rounded-3xl border border-border bg-card p-5 sm:p-6">
              <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Check understanding</p>
              <h2 className="mt-1 text-2xl font-black">Lesson practice preview</h2>
              <div className="mt-5 space-y-3">{resolved.lesson.practiceQuestions.slice(0, 5).map((question, index) => <details key={`${question.question}-${index}`} className="rounded-2xl border border-border bg-background p-4"><summary className="cursor-pointer font-bold">{index + 1}. {question.question}</summary><div className="mt-3 space-y-2 text-sm text-muted-foreground">{question.options.map((option, optionIndex) => <p key={`${option}-${optionIndex}`} className={optionIndex === question.answer ? 'font-bold text-emerald-600' : ''}>{String.fromCharCode(65 + optionIndex)}. {option}</p>)}<p className="border-t border-border pt-3 leading-6"><strong>Explanation:</strong> {question.explanation}</p></div></details>)}</div>
              <Link href={practiceHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground">Continue in Practice <ArrowRight className="h-4 w-4" /></Link>
            </section>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {adjacent.prev && <Link href={`${lessonBaseHref}/${adjacent.prev.slug}`} className="rounded-2xl border border-border bg-card p-4 hover:bg-accent"><p className="text-xs font-black uppercase tracking-wide text-muted-foreground">Previous lesson</p><p className="mt-1 font-black">{adjacent.prev.title}</p></Link>}
            {adjacent.next && <Link href={`${lessonBaseHref}/${adjacent.next.slug}`} className="rounded-2xl border border-primary/25 bg-primary/5 p-4 text-right hover:bg-primary/10"><p className="text-xs font-black uppercase tracking-wide text-primary">Next lesson</p><p className="mt-1 font-black">{adjacent.next.title}</p></Link>}
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-20 lg:max-h-[calc(100vh-6rem)] lg:overflow-y-auto">
          <ToolCard icon={BrainCircuit} title="Ask LEO" description="Explain this exact lesson in English, Hinglish or Marathi." href={tutorHref} label="Open Tutor" primary />
          <ToolCard icon={ListChecks} title="Practice" description="Attempt lesson questions and save mistakes for revision." href={practiceHref} label="Start practice" />
          <ToolCard icon={LibraryBig} title="Notebook" description="Save formulas, questions, highlights and mistakes." href={notebookHref} label="Open notebook" />
          <ToolCard icon={FileText} title="Detailed Materials" description="Read the complete digital textbook version of this lesson." href={materialsHref} label="Open Materials" />
          <ToolCard icon={Code2} title="Apply" description="Use Coding Lab for implementation-oriented lessons." href={`/coding?subject=${encodeURIComponent(resolvedSubjectCode)}&lesson=${encodeURIComponent(resolved.lesson.title)}`} label="Open Coding Lab" />
          <section className="rounded-3xl border border-border bg-card p-5"><p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Source transparency</p><p className="mt-3 text-xs leading-5 text-muted-foreground">Video candidates originate from the curriculum resource manifest. Playlists are excluded from lesson players, and direct videos are assigned at most once per subject journey.</p>{video && <p className="mt-2 text-xs leading-5 text-muted-foreground">Source: {video.resource.sourcePdf} · page {video.resource.sourcePage}</p>}</section>
        </aside>
      </div>
    </main>
  )
}

function resolveLesson(
  notes: SubjectNotes | null,
  syntheticUnits: Array<{ number: number; title: string; weightage: number; lessons: ManifestLesson[] }>,
  lessonSlug: string,
): ResolvedManifestLesson | null {
  if (notes) {
    const match = findLessonBySlug(notes.subjectCode, lessonSlug)
    if (!match) return null
    return {
      lesson: match.lesson,
      unitNumber: match.unit.number,
      unitTitle: match.unit.title,
      unitWeightage: match.unit.weightage,
      subjectNotes: notes,
    }
  }

  for (const unit of syntheticUnits) {
    const lesson = unit.lessons.find((item) => item.slug === lessonSlug)
    if (lesson) {
      return {
        lesson: toResolverLesson(lesson),
        unitNumber: unit.number,
        unitTitle: unit.title,
        unitWeightage: unit.weightage,
        subjectNotes: null,
      }
    }
  }
  return null
}

function toResolverLesson(lesson: ManifestLesson): Lesson {
  return {
    slug: lesson.slug,
    title: lesson.title,
    durationMin: lesson.durationMin,
    difficulty: lesson.difficulty,
    overview: lesson.description,
    keyConcepts: lesson.outcomes,
    formulas: [],
    tables: [],
    diagrams: [],
    codeExamples: [],
    commonMistakes: [],
    examTips: [],
    practiceQuestions: [],
    objectives: lesson.outcomes,
  }
}

function syntheticAdjacent(lessons: ManifestLesson[], slug: string) {
  const index = lessons.findIndex((lesson) => lesson.slug === slug)
  return {
    prev: index > 0 ? lessons[index - 1] : null,
    next: index >= 0 && index < lessons.length - 1 ? lessons[index + 1] : null,
  }
}

function mappingLabel(reason: 'title_match' | 'concept_match' | 'ordered_subject_fallback') {
  if (reason === 'title_match') return 'title and syllabus match'
  if (reason === 'concept_match') return 'lesson concept match'
  return 'ordered direct-video fallback'
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return <div className="rounded-2xl border border-border bg-background/85 p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-black">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
}

function LessonCard({ icon: Icon, title, items, empty, tone = 'normal' }: { icon: LucideIcon; title: string; items: string[]; empty: string; tone?: 'normal' | 'warning' }) {
  return <section className={`rounded-3xl border p-5 sm:p-6 ${tone === 'warning' ? 'border-amber-500/25 bg-amber-500/5' : 'border-border bg-card'}`}><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="font-black">{title}</h2></div>{items.length ? <ul className="mt-4 space-y-2">{items.map((item, index) => <li key={`${item}-${index}`} className="flex gap-2 text-sm leading-6 text-muted-foreground"><CheckCircle2 className="mt-1 h-3.5 w-3.5 shrink-0 text-primary" /><span>{item}</span></li>)}</ul> : <p className="mt-3 text-sm leading-6 text-muted-foreground">{empty}</p>}</section>
}

function ToolCard({ icon: Icon, title, description, href, label, primary = false }: { icon: LucideIcon; title: string; description: string; href: string; label: string; primary?: boolean }) {
  return <section className="rounded-3xl border border-border bg-card p-5"><div className="flex items-center gap-2"><Icon className="h-5 w-5 text-primary" /><h2 className="font-black">{title}</h2></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{description}</p><Link href={href} className={`mt-4 inline-flex min-h-10 w-full items-center justify-center gap-2 rounded-xl px-3 text-sm font-bold ${primary ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}>{label}<ArrowRight className="h-4 w-4" /></Link></section>
}

function MissingLesson({ subjectHref }: { subjectHref: string }) {
  return <main className="grid min-h-screen place-items-center bg-background px-5 text-center"><div><BookOpen className="mx-auto h-10 w-10 text-muted-foreground" /><h1 className="mt-4 text-2xl font-black">Lesson not found</h1><p className="mt-2 text-sm text-muted-foreground">This lesson slug does not match the published subject structure.</p><Link href={subjectHref} className="mt-5 inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 text-sm font-bold text-primary-foreground"><ArrowLeft className="h-4 w-4" /> Back to subject</Link></div></main>
}
