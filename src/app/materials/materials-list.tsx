'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileQuestion,
  Filter,
  Layers3,
  Search,
  Sparkles,
  Target,
} from 'lucide-react'

interface CatalogLesson {
  slug: string
  title: string
  durationMin: number
  difficulty: string
  practiceQuestionCount: number
  flashcardCount: number
  sectionCount: number
}

interface CatalogUnit {
  number: number
  title: string
  weightage: number
  lessons: CatalogLesson[]
}

export interface MaterialsCatalogSubjectClient {
  code: string
  name: string
  semester: number
  credits: number
  unitCount: number
  lessonCount: number
  practiceQuestionCount: number
  flashcardCount: number
  units: CatalogUnit[]
}

interface LastOpenedMaterial {
  subjectCode: string
  lessonSlug: string
  lessonTitle: string
}

export function MaterialsList({
  subjects,
  initialSubjectCode,
}: {
  subjects: MaterialsCatalogSubjectClient[]
  initialSubjectCode?: string | null
}) {
  const [search, setSearch] = useState('')
  const [semester, setSemester] = useState<number | null>(null)
  const [selectedCode, setSelectedCode] = useState<string | null>(
    initialSubjectCode ?? null,
  )
  const [lessonSearch, setLessonSearch] = useState('')
  const [lastOpened, setLastOpened] = useState<LastOpenedMaterial | null>(null)

  useEffect(() => {
    const restoreLastOpened = window.setTimeout(() => {
      try {
        const raw = window.localStorage.getItem('lernio:materials:last-opened')
        if (raw) setLastOpened(JSON.parse(raw) as LastOpenedMaterial)
      } catch {
        // A blocked or corrupt localStorage entry must never break Materials.
      }
    }, 0)
    return () => window.clearTimeout(restoreLastOpened)
  }, [])

  const filteredSubjects = useMemo(() => {
    const query = search.trim().toLowerCase()
    return subjects.filter((subject) => {
      const matchesSemester = semester === null || subject.semester === semester
      const matchesSearch =
        !query ||
        subject.name.toLowerCase().includes(query) ||
        subject.code.toLowerCase().includes(query) ||
        subject.units.some((unit) =>
          unit.lessons.some((lesson) => lesson.title.toLowerCase().includes(query)),
        )
      return matchesSemester && matchesSearch
    })
  }, [search, semester, subjects])

  const selectedSubject = subjects.find((subject) => subject.code === selectedCode) ?? null

  const selectSubject = (subjectCode: string | null) => {
    setSelectedCode(subjectCode)
    setLessonSearch('')
    const url = new URL(window.location.href)
    if (subjectCode) url.searchParams.set('subject', subjectCode)
    else url.searchParams.delete('subject')
    url.searchParams.delete('lesson')
    url.searchParams.delete('lessonId')
    window.history.replaceState(window.history.state, '', `${url.pathname}${url.search}`)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  if (selectedSubject) {
    return (
      <SubjectLibrary
        subject={selectedSubject}
        lessonSearch={lessonSearch}
        setLessonSearch={setLessonSearch}
        lastOpened={lastOpened}
        onBack={() => selectSubject(null)}
      />
    )
  }

  const grouped = groupBySemester(filteredSubjects)

  return (
    <div className="space-y-6">
      {lastOpened && subjects.some((subject) => subject.code === lastOpened.subjectCode) ? (
        <Link
          href={`/materials/lesson/${encodeURIComponent(lastOpened.subjectCode)}/${encodeURIComponent(lastOpened.lessonSlug)}`}
          className="group flex items-center gap-4 rounded-2xl border border-primary/25 bg-gradient-to-r from-primary/10 via-card to-card p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md"
        >
          <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground">
            <BookOpen className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block text-[11px] font-black uppercase tracking-[0.14em] text-primary">
              Continue reading
            </span>
            <span className="mt-1 block truncate font-black">{lastOpened.lessonTitle}</span>
            <span className="block text-xs text-muted-foreground">{lastOpened.subjectCode}</span>
          </span>
          <ArrowRight className="h-5 w-5 shrink-0 text-primary transition group-hover:translate-x-1" />
        </Link>
      ) : null}

      <div className="rounded-2xl border border-border bg-card p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_190px]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search subject, code, or lesson..."
              className="min-h-11 w-full rounded-xl border border-border bg-background pl-10 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            />
          </label>
          <label className="relative block">
            <Filter className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <select
              value={semester ?? ''}
              onChange={(event) => setSemester(event.target.value ? Number(event.target.value) : null)}
              className="min-h-11 w-full appearance-none rounded-xl border border-border bg-background pl-10 pr-3 text-sm font-semibold outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/15"
            >
              <option value="">All semesters</option>
              {[1, 2, 3, 4, 5, 6].map((number) => (
                <option key={number} value={number}>Semester {number}</option>
              ))}
            </select>
          </label>
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Showing <strong className="text-foreground">{filteredSubjects.length}</strong> verified digital textbooks. Every lesson below comes from the real notes catalog—no generated placeholder links.
        </p>
      </div>

      {grouped.length ? (
        grouped.map(([semesterNumber, semesterSubjects]) => (
          <section key={semesterNumber} className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-sm font-black text-primary">
                {semesterNumber}
              </span>
              <div>
                <h2 className="text-sm font-black">Semester {semesterNumber}</h2>
                <p className="text-xs text-muted-foreground">{semesterSubjects.length} subjects with interactive notes</p>
              </div>
            </div>
            <div className="grid gap-3 md:grid-cols-2">
              {semesterSubjects.map((subject) => (
                <button
                  key={subject.code}
                  type="button"
                  onClick={() => selectSubject(subject.code)}
                  className="group rounded-2xl border border-border bg-card p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-primary/35 hover:shadow-md"
                >
                  <div className="flex items-start gap-3">
                    <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary transition group-hover:bg-primary group-hover:text-primary-foreground">
                      <BookOpen className="h-5 w-5" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[11px] font-black uppercase tracking-[0.12em] text-primary">{subject.code}</span>
                      <span className="mt-1 block font-black leading-snug">{subject.name}</span>
                    </span>
                    <ChevronRight className="mt-1 h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </div>
                  <div className="mt-4 grid grid-cols-3 gap-2 text-center">
                    <Stat value={subject.unitCount} label="Units" />
                    <Stat value={subject.lessonCount} label="Lessons" />
                    <Stat value={subject.practiceQuestionCount} label="Questions" />
                  </div>
                </button>
              ))}
            </div>
          </section>
        ))
      ) : (
        <div className="rounded-3xl border border-dashed border-border bg-card px-5 py-12 text-center">
          <Search className="mx-auto h-8 w-8 text-muted-foreground" />
          <h2 className="mt-3 text-lg font-black">No matching notes found</h2>
          <p className="mt-1 text-sm text-muted-foreground">Try a subject code, a lesson title, or clear the semester filter.</p>
        </div>
      )}
    </div>
  )
}

function SubjectLibrary({
  subject,
  lessonSearch,
  setLessonSearch,
  lastOpened,
  onBack,
}: {
  subject: MaterialsCatalogSubjectClient
  lessonSearch: string
  setLessonSearch: (value: string) => void
  lastOpened: LastOpenedMaterial | null
  onBack: () => void
}) {
  const query = lessonSearch.trim().toLowerCase()
  const filteredUnits = subject.units
    .map((unit) => ({
      ...unit,
      lessons: unit.lessons.filter((lesson) => !query || lesson.title.toLowerCase().includes(query)),
    }))
    .filter((unit) => unit.lessons.length > 0)

  return (
    <div className="space-y-5">
      <button
        type="button"
        onClick={onBack}
        className="inline-flex min-h-10 items-center gap-2 rounded-xl px-2 text-sm font-bold text-muted-foreground hover:bg-accent hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> All subjects
      </button>

      <section className="relative overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/15 via-card to-card p-5 shadow-sm sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-20 h-52 w-52 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div className="max-w-3xl">
              <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Digital textbook · Semester {subject.semester}</p>
              <h2 className="mt-2 text-2xl font-black tracking-tight sm:text-4xl">{subject.name}</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                {subject.unitCount} units, {subject.lessonCount} complete lessons, {subject.practiceQuestionCount} practice questions, and {subject.flashcardCount} flashcards—all linked to the actual curriculum content.
              </p>
            </div>
            <span className="inline-flex w-fit items-center gap-2 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-3 py-1.5 text-xs font-black text-emerald-700 dark:text-emerald-300">
              <CheckCircle2 className="h-4 w-4" /> Interactive notes available
            </span>
          </div>

          <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
            <HeroStat icon={Layers3} value={subject.unitCount} label="Units" />
            <HeroStat icon={BookOpen} value={subject.lessonCount} label="Lessons" />
            <HeroStat icon={FileQuestion} value={subject.practiceQuestionCount} label="Questions" />
            <HeroStat icon={Sparkles} value={subject.flashcardCount} label="Flashcards" />
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_auto_auto]">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={lessonSearch}
            onChange={(event) => setLessonSearch(event.target.value)}
            placeholder={`Search ${subject.name} lessons...`}
            className="min-h-11 w-full rounded-xl border border-border bg-card pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
          />
        </label>
        <Link
          href={`/practice?subject=${encodeURIComponent(subject.code)}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-bold hover:bg-accent"
        >
          <Target className="h-4 w-4" /> Practice
        </Link>
        <Link
          href={`/tutor?subject=${encodeURIComponent(subject.code)}`}
          className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
        >
          <BrainCircuit className="h-4 w-4" /> Ask LEO
        </Link>
      </div>

      <div className="space-y-4">
        {filteredUnits.map((unit) => (
          <section key={unit.number} className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border bg-muted/35 px-4 py-3 sm:px-5">
              <div className="flex items-center gap-3">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary text-sm font-black text-primary-foreground">U{unit.number}</span>
                <div>
                  <h3 className="font-black">{unit.title}</h3>
                  <p className="text-xs text-muted-foreground">{unit.lessons.length} lessons</p>
                </div>
              </div>
              {unit.weightage > 0 ? (
                <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-bold text-primary">{unit.weightage}% weightage</span>
              ) : null}
            </div>
            <div className="divide-y divide-border">
              {unit.lessons.map((lesson, index) => {
                const isRecent =
                  lastOpened?.subjectCode === subject.code &&
                  lastOpened.lessonSlug === lesson.slug
                return (
                  <Link
                    key={lesson.slug}
                    href={`/materials/lesson/${encodeURIComponent(subject.code)}/${encodeURIComponent(lesson.slug)}`}
                    className="group flex items-center gap-3 px-4 py-4 transition hover:bg-accent/55 sm:px-5"
                  >
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl border border-border bg-background text-xs font-black text-muted-foreground group-hover:border-primary/40 group-hover:text-primary">
                      {index + 1}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="font-bold leading-snug">{lesson.title}</span>
                        {isRecent ? (
                          <span className="rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black uppercase tracking-wide text-primary">Continue</span>
                        ) : null}
                      </span>
                      <span className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1"><Clock3 className="h-3.5 w-3.5" />{lesson.durationMin} min</span>
                        <span>{lesson.sectionCount} learning sections</span>
                        <span>{lesson.practiceQuestionCount} questions</span>
                        <span className="capitalize">{lesson.difficulty}</span>
                      </span>
                    </span>
                    <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition group-hover:translate-x-1 group-hover:text-primary" />
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {!filteredUnits.length ? (
        <div className="rounded-2xl border border-dashed border-border bg-card px-5 py-10 text-center">
          <Search className="mx-auto h-7 w-7 text-muted-foreground" />
          <p className="mt-3 font-black">No lesson matches “{lessonSearch}”</p>
          <button type="button" onClick={() => setLessonSearch('')} className="mt-3 text-sm font-bold text-primary hover:underline">Clear search</button>
        </div>
      ) : null}
    </div>
  )
}

function groupBySemester(subjects: MaterialsCatalogSubjectClient[]) {
  const groups = new Map<number, MaterialsCatalogSubjectClient[]>()
  for (const subject of subjects) {
    const current = groups.get(subject.semester) ?? []
    current.push(subject)
    groups.set(subject.semester, current)
  }
  return Array.from(groups.entries()).sort(([left], [right]) => left - right)
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <span className="rounded-xl bg-muted/55 px-2 py-2">
      <span className="block text-sm font-black">{value}</span>
      <span className="block text-[10px] font-bold uppercase tracking-wide text-muted-foreground">{label}</span>
    </span>
  )
}

function HeroStat({ icon: Icon, value, label }: { icon: typeof BookOpen; value: number; label: string }) {
  return (
    <span className="rounded-2xl border border-border/75 bg-background/70 p-3 backdrop-blur">
      <Icon className="h-4 w-4 text-primary" />
      <span className="mt-2 block text-xl font-black">{value}</span>
      <span className="block text-xs font-semibold text-muted-foreground">{label}</span>
    </span>
  )
}
