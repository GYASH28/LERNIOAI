import Link from 'next/link'
import { redirect } from 'next/navigation'
import {
  ArrowLeft,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  FileQuestion,
  Layers3,
  Sparkles,
} from 'lucide-react'
import { getCurrentUser } from '@/lib/auth'
import { db } from '@/lib/db'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { MaterialsList } from './materials-list'
import {
  canonicalMaterialsHref,
  getMaterialsCatalog,
  resolveMaterialsLesson,
} from '@/lib/curriculum/materials-catalog'

export const dynamic = 'force-dynamic'

type SearchParams = Record<string, string | string[] | undefined>

export default async function MaterialsPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}) {
  const user = await getCurrentUser()
  if (!user) redirect('/sign-in?callbackUrl=/materials')

  const query = await searchParams
  const requestedSubject = firstValue(query.subject) ?? firstValue(query.subjectCode)
  const requestedLesson = firstValue(query.lesson) ?? firstValue(query.lessonSlug)
  const lessonId = firstValue(query.lessonId)

  if (requestedSubject && requestedLesson) {
    const resolved = resolveMaterialsLesson(requestedSubject, requestedLesson)
    if (resolved) {
      redirect(canonicalMaterialsHref(resolved.subject.subjectCode, resolved.lesson.slug))
    }
  }

  if (lessonId) {
    const dbLesson = await db.lesson.findUnique({
      where: { id: lessonId },
      select: {
        title: true,
        unit: {
          select: {
            subject: { select: { code: true } },
          },
        },
        topic: {
          select: {
            unit: {
              select: {
                subject: { select: { code: true } },
              },
            },
          },
        },
      },
    }).catch(() => null)

    const subjectCode = dbLesson?.unit?.subject.code ?? dbLesson?.topic?.unit.subject.code
    if (dbLesson && subjectCode) {
      const resolved = resolveMaterialsLesson(subjectCode, dbLesson.title)
      if (resolved) {
        redirect(canonicalMaterialsHref(resolved.subject.subjectCode, resolved.lesson.slug))
      }
    }
  }

  const subjects = getMaterialsCatalog()
  const initialSubjectCode = requestedSubject
    ? subjects.find((subject) => subject.code.toUpperCase() === requestedSubject.toUpperCase())?.code ?? null
    : null
  const lessonCount = subjects.reduce((total, subject) => total + subject.lessonCount, 0)
  const questionCount = subjects.reduce(
    (total, subject) => total + subject.practiceQuestionCount,
    0,
  )
  const semesterCount = new Set(subjects.map((subject) => subject.semester)).size

  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <TopBar />
      <main className="page-wipe flex-1">
        <section className="relative overflow-hidden border-b border-border/70 bg-gradient-to-br from-primary/12 via-background to-background">
          <div className="pointer-events-none absolute -right-24 -top-32 h-96 w-96 rounded-full bg-primary/10 blur-3xl" />
          <div className="relative mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-12 lg:px-8">
            <Link
              href="/dashboard"
              className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Dashboard
            </Link>

            <div className="mt-4 grid gap-7 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
              <div>
                <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 py-1.5 text-xs font-black uppercase tracking-[0.14em] text-primary">
                  <Sparkles className="h-4 w-4" /> Lernio digital library
                </span>
                <h1 className="mt-4 max-w-3xl text-3xl font-black tracking-tight sm:text-5xl">
                  Notes built like an interactive textbook—not a pile of dead PDFs.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
                  Open the exact lesson, move through presentation-style explanations, code, diagrams, questions, flashcards, and ask LEO without losing your place.
                </p>
                <div className="mt-5 flex flex-wrap gap-2">
                  <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4" /> Real lesson catalog
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground">
                    <BookOpen className="h-4 w-4" /> Mobile reading mode
                  </span>
                  <span className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-3 py-1.5 text-xs font-bold text-muted-foreground">
                    <BrainCircuit className="h-4 w-4" /> Context-aware LEO handoff
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LibraryStat icon={BookOpen} value={subjects.length} label="Subjects" />
                <LibraryStat icon={Layers3} value={lessonCount} label="Lessons" />
                <LibraryStat icon={FileQuestion} value={questionCount} label="Questions" />
                <LibraryStat icon={Sparkles} value={semesterCount} label="Semesters" />
              </div>
            </div>
          </div>
        </section>

        <section className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
          <MaterialsList subjects={subjects} initialSubjectCode={initialSubjectCode} />
        </section>
      </main>
      <Footer />
    </div>
  )
}

function LibraryStat({
  icon: Icon,
  value,
  label,
}: {
  icon: typeof BookOpen
  value: number
  label: string
}) {
  return (
    <div className="rounded-2xl border border-border bg-card/85 p-4 shadow-sm backdrop-blur">
      <Icon className="h-5 w-5 text-primary" />
      <p className="mt-3 text-2xl font-black">{value}</p>
      <p className="text-xs font-bold text-muted-foreground">{label}</p>
    </div>
  )
}

function firstValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}
