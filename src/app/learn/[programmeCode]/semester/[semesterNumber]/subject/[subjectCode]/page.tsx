import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  Clock3,
  Code2,
  FileText,
  Gamepad2,
  GraduationCap,
  Layers,
  LibraryBig,
  ListChecks,
  PlayCircle,
  Target,
  Video,
  type LucideIcon,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { getManifestSubject } from '@/lib/curriculum/manifest-data'
import { enhanceSubject, type ManifestLesson } from '@/lib/curriculum/enhanced-manifest'
import { getSubjectNotes, type Lesson, type Unit } from '@/lib/curriculum/lesson-notes-loader'
import { buildManifestLessonVideoAssignments } from '@/lib/curriculum/lesson-video-resolver'
import { QuickRevisionHub } from '@/components/learning/quick-revision-hub'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

interface NormalizedLesson {
  slug: string
  title: string
  description: string
  overview: string
  durationMin: number
  difficulty: string
  objectives: string[]
  keyConcepts: string[]
  unitNumber: number
  unitTitle: string
  unitWeightage: number
  resolverLesson: Lesson
}

interface NormalizedUnit {
  number: number
  title: string
  description: string
  weightage: number
  lessons: NormalizedLesson[]
}

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
  if (!Number.isInteger(semester) || semester < 1 || semester > 6) notFound()

  const manifestSubject = getManifestSubject(programmeCode, semester, subjectCode)
  if (!manifestSubject) notFound()

  const subject = enhanceSubject(manifestSubject)
  const resolvedCode = programmeCode === 'DCIOT' && subject.alternateCode ? subject.alternateCode : subject.code
  const notes = getSubjectNotes(resolvedCode) ?? getSubjectNotes(subject.code)
  const units = notes ? normalizeNotesUnits(notes.units) : normalizeManifestUnits(subject.units)
  const orderedLessons = units.flatMap((unit) => unit.lessons)
  const videoAssignments = buildManifestLessonVideoAssignments(
    manifestSubject,
    orderedLessons.map((lesson) => lesson.resolverLesson),
  )
  const firstLesson = orderedLessons[0]
  const firstLessonHref = firstLesson
    ? lessonHref(programmeCode, semester, subjectCode, firstLesson.slug)
    : null
  const semesterHref = `/learn/${programmeCode}/semester/${semester}`
  const tutorHref = `/tutor?${new URLSearchParams({ subject: resolvedCode }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({ subject: resolvedCode }).toString()}`
  const materialsHref = `/materials?${new URLSearchParams({ subject: resolvedCode }).toString()}`
  const safeName = subject.name
    .toLowerCase()
    .replace(/&/g, 'and')
    .replace(/\//g, '-')
    .replace(/[^a-z0-9-]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '')
  const pdfHref = `/lesson-notes/${resolvedCode.toLowerCase()}-${safeName}.pdf`

  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="border-b border-border/70 bg-gradient-to-br from-primary/10 via-background to-background">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
            <Link href="/learn" className="font-semibold hover:text-foreground">Learning OS</Link>
            <span>/</span>
            <Link href={semesterHref} className="inline-flex items-center gap-1 font-semibold hover:text-foreground">
              <ArrowLeft className="h-4 w-4" /> Semester {semester}
            </Link>
          </div>

          <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-end">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-black uppercase tracking-wide text-primary">{resolvedCode}</span>
                <span className="rounded-full bg-muted px-2.5 py-1 text-xs font-bold capitalize text-muted-foreground">{subject.category}</span>
                {subject.priority.includes('critical') && <span className="rounded-full bg-rose-500/10 px-2.5 py-1 text-xs font-bold text-rose-600">High priority</span>}
              </div>
              <h1 className="mt-3 max-w-4xl text-3xl font-black tracking-tight sm:text-5xl">{subject.name}</h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground sm:text-base">{subject.description}</p>
              <p className="mt-3 max-w-3xl text-sm leading-6"><strong>What this subject builds:</strong> {subject.coverageFocus}</p>
              <div className="mt-5 flex flex-wrap gap-2">
                {firstLessonHref && <Link href={firstLessonHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-black text-primary-foreground"><PlayCircle className="h-4 w-4" /> Start first lesson</Link>}
                <Link href={materialsHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><FileText className="h-4 w-4" /> Detailed notes</Link>
                <Link href={tutorHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border bg-background/80 px-4 py-2.5 text-sm font-bold hover:bg-accent"><BrainCircuit className="h-4 w-4" /> Ask LEO</Link>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:min-w-[480px]">
              <Metric icon={Layers} label="Units" value={units.length} />
              <Metric icon={BookOpen} label="Lessons" value={orderedLessons.length} />
              <Metric icon={Video} label="Mapped videos" value={videoAssignments.size} />
              <Metric icon={GraduationCap} label="Credits" value={subject.credits} />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px]">
          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Subject journey</p>
            <h2 className="mt-1 text-2xl font-black">Follow the curriculum in order</h2>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">
              Every card opens a separate lesson workspace. Videos are assigned to lessons individually; playlists are never used as the lesson player.
            </p>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {subject.outcomes.map((outcome, index) => <div key={`${outcome}-${index}`} className="flex gap-3 rounded-2xl border border-border bg-background p-4"><CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" /><p className="text-sm leading-5 text-muted-foreground">{outcome}</p></div>)}
            </div>
          </div>

          <div className="rounded-3xl border border-border bg-card p-5 sm:p-6">
            <p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Assessment</p>
            <h2 className="mt-1 text-xl font-black">Prepare with the right emphasis</h2>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">{subject.assessmentPattern}</p>
            <div className="mt-4 grid gap-2">
              <Link href={practiceHref} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent"><ListChecks className="h-4 w-4 text-primary" /> Practise this subject</Link>
              <Link href={`/games?subject=${encodeURIComponent(resolvedCode)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent"><Gamepad2 className="h-4 w-4 text-primary" /> Play subject challenges</Link>
              <Link href={`/notebook?subject=${encodeURIComponent(resolvedCode)}`} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-bold hover:bg-accent"><LibraryBig className="h-4 w-4 text-primary" /> Open subject notebook</Link>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div><p className="text-xs font-black uppercase tracking-[0.15em] text-primary">Lesson map</p><h2 className="mt-1 text-2xl font-black">{orderedLessons.length} specific lesson workspaces</h2></div>
            <span className="rounded-full bg-muted px-3 py-1.5 text-xs font-bold text-muted-foreground">{videoAssignments.size}/{orderedLessons.length} direct videos mapped</span>
          </div>

          <div className="space-y-4">
            {units.map((unit) => (
              <article key={unit.number} className="overflow-hidden rounded-3xl border border-border bg-card">
                <div className="flex flex-col gap-3 border-b border-border bg-muted/30 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
                  <div><p className="text-xs font-black uppercase tracking-wide text-primary">Unit {unit.number}</p><h3 className="mt-1 text-xl font-black">{unit.title}</h3><p className="mt-1 max-w-3xl text-sm leading-5 text-muted-foreground">{unit.description}</p></div>
                  <div className="flex items-center gap-2"><span className="rounded-full bg-background px-3 py-1.5 text-xs font-bold">{unit.lessons.length} lessons</span>{unit.weightage > 0 && <span className="rounded-full bg-primary/10 px-3 py-1.5 text-xs font-bold text-primary">{unit.weightage}% weightage</span>}</div>
                </div>
                <div className="grid gap-3 p-4 sm:p-5 lg:grid-cols-2">
                  {unit.lessons.map((lesson, lessonIndex) => {
                    const video = videoAssignments.get(lesson.slug)
                    const href = lessonHref(programmeCode, semester, subjectCode, lesson.slug)
                    const globalIndex = orderedLessons.findIndex((item) => item.slug === lesson.slug) + 1
                    return (
                      <Link key={lesson.slug} href={href} className="group flex min-h-44 flex-col rounded-2xl border border-border bg-background p-4 transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-sm">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3"><span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-black text-primary">{globalIndex}</span><div><p className="text-[10px] font-black uppercase tracking-wide text-muted-foreground">Unit {unit.number} · Lesson {lessonIndex + 1}</p><h4 className="mt-1 font-black leading-tight">{lesson.title}</h4></div></div>
                          <ArrowRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
                        </div>
                        <p className="mt-3 line-clamp-2 text-sm leading-5 text-muted-foreground">{lesson.overview || lesson.description}</p>
                        <div className="mt-auto flex flex-wrap items-center gap-2 pt-4 text-[11px] font-bold">
                          <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-1"><Clock3 className="h-3 w-3" /> {lesson.durationMin} min</span>
                          <span className="rounded-full bg-muted px-2 py-1 capitalize">{lesson.difficulty}</span>
                          <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-1', video ? 'bg-red-500/10 text-red-600' : 'bg-amber-500/10 text-amber-700')}><Video className="h-3 w-3" /> {video ? 'Specific video' : 'Notes + LEO'}</span>
                          {lesson.keyConcepts.length > 0 && <span className="rounded-full bg-emerald-500/10 px-2 py-1 text-emerald-700">Rich notes</span>}
                        </div>
                      </Link>
                    )
                  })}
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-4 lg:grid-cols-3">
          <a href={pdfHref} download className="group rounded-3xl border border-primary/20 bg-primary/5 p-5"><FileText className="h-6 w-6 text-primary" /><h2 className="mt-3 text-lg font-black">Download subject summary</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Keep a concise offline PDF for revision. Full digital-textbook notes remain in Materials.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Download PDF <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></a>
          <Link href={materialsHref} className="group rounded-3xl border border-border bg-card p-5"><BookOpen className="h-6 w-6 text-primary" /><h2 className="mt-3 text-lg font-black">Open detailed Materials</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Read complete lesson notes, diagrams, examples and downloadable resources without mixing them into the Learn summary.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Open Materials <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
          <Link href={`/coding?subject=${encodeURIComponent(resolvedCode)}`} className="group rounded-3xl border border-border bg-card p-5"><Code2 className="h-6 w-6 text-primary" /><h2 className="mt-3 text-lg font-black">Apply it practically</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Use Coding Lab or practical exercises when the subject includes implementation work.</p><span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-primary">Open practical tools <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" /></span></Link>
        </section>

        {notes && <QuickRevisionHub notes={notes} />}
      </div>
    </main>
  )
}

function normalizeNotesUnits(units: Unit[]): NormalizedUnit[] {
  return units.map((unit) => ({
    number: unit.number,
    title: unit.title,
    description: `Study ${unit.title} through ${unit.lessons.length} ordered lesson${unit.lessons.length === 1 ? '' : 's'}.`,
    weightage: unit.weightage,
    lessons: unit.lessons.map((lesson) => ({
      slug: lesson.slug,
      title: lesson.title,
      description: lesson.overview,
      overview: lesson.overview,
      durationMin: lesson.durationMin,
      difficulty: lesson.difficulty,
      objectives: lesson.objectives ?? [],
      keyConcepts: lesson.keyConcepts ?? [],
      unitNumber: unit.number,
      unitTitle: unit.title,
      unitWeightage: unit.weightage,
      resolverLesson: lesson,
    })),
  }))
}

function normalizeManifestUnits(units: Array<{ number: number; title: string; description: string; weightage: number; lessons: ManifestLesson[] }>): NormalizedUnit[] {
  return units.map((unit) => ({
    number: unit.number,
    title: unit.title,
    description: unit.description,
    weightage: unit.weightage,
    lessons: unit.lessons.map((lesson) => {
      const resolverLesson: Lesson = {
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
      return {
        slug: lesson.slug,
        title: lesson.title,
        description: lesson.description,
        overview: lesson.description,
        durationMin: lesson.durationMin,
        difficulty: lesson.difficulty,
        objectives: lesson.outcomes,
        keyConcepts: lesson.outcomes,
        unitNumber: unit.number,
        unitTitle: unit.title,
        unitWeightage: unit.weightage,
        resolverLesson,
      }
    }),
  }))
}

function lessonHref(programmeCode: string, semester: number, subjectCode: string, lessonSlug: string) {
  return `/learn/${programmeCode}/semester/${semester}/subject/${subjectCode}/lesson/${lessonSlug}`
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: number | string }) {
  return <div className="rounded-2xl border border-border bg-background/85 p-3"><Icon className="h-4 w-4 text-primary" /><p className="mt-2 text-xl font-black tabular-nums">{value}</p><p className="text-[11px] text-muted-foreground">{label}</p></div>
}
