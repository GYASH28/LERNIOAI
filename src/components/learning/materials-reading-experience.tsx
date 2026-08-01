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
  ListChecks,
  Menu,
  Search,
  X,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { PresentationDeck } from '@/components/learning/presentation-deck'

interface LessonMapItem {
  slug: string
  title: string
  unitNumber: number
  unitTitle: string
  durationMin: number
}

interface MaterialsReadingExperienceProps {
  lesson: Lesson
  subject: SubjectNotes
  lessons: LessonMapItem[]
  prevHref?: string | null
  nextHref?: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}

export function MaterialsReadingExperience({
  lesson,
  subject,
  lessons,
  prevHref,
  nextHref,
  prevTitle,
  nextTitle,
}: MaterialsReadingExperienceProps) {
  const [mapOpen, setMapOpen] = useState(false)
  const [lessonQuery, setLessonQuery] = useState('')

  useEffect(() => {
    try {
      window.localStorage.setItem(
        'lernio:materials:last-opened',
        JSON.stringify({
          subjectCode: subject.subjectCode,
          lessonSlug: lesson.slug,
          lessonTitle: lesson.title,
          openedAt: new Date().toISOString(),
        }),
      )
    } catch {
      // Reading must keep working when storage is unavailable.
    }
  }, [lesson.slug, lesson.title, subject.subjectCode])

  useEffect(() => {
    if (!mapOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMapOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [mapOpen])

  const filteredLessons = useMemo(() => {
    const query = lessonQuery.trim().toLowerCase()
    return query
      ? lessons.filter((item) =>
          item.title.toLowerCase().includes(query) ||
          item.unitTitle.toLowerCase().includes(query),
        )
      : lessons
  }, [lessonQuery, lessons])

  const tutorHref = `/tutor?${new URLSearchParams({
    subject: subject.subjectCode,
    lesson: lesson.title,
  }).toString()}`
  const practiceHref = `/practice?${new URLSearchParams({
    subject: subject.subjectCode,
    lesson: lesson.title,
  }).toString()}`

  return (
    <>
      <div className="grid gap-4 xl:grid-cols-[260px_minmax(0,1fr)] xl:items-start">
        <aside className="hidden rounded-2xl border border-border bg-card p-3 shadow-sm xl:sticky xl:top-20 xl:block xl:max-h-[calc(100dvh-6rem)] xl:overflow-y-auto">
          <LessonMap
            lessons={filteredLessons}
            subjectCode={subject.subjectCode}
            currentSlug={lesson.slug}
            query={lessonQuery}
            setQuery={setLessonQuery}
          />
        </aside>

        <div className="min-w-0">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm sm:p-3">
            <button
              type="button"
              onClick={() => setMapOpen(true)}
              className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-bold hover:bg-accent xl:hidden"
            >
              <Menu className="h-4 w-4" /> Lesson map
            </button>
            <div className="min-w-0 flex-1 px-1">
              <p className="truncate text-xs font-black uppercase tracking-[0.12em] text-primary">{subject.subjectCode} · Textbook mode</p>
              <p className="truncate text-sm font-bold text-muted-foreground">{lesson.title}</p>
            </div>
            <div className="hidden gap-2 sm:flex">
              <Link
                href={practiceHref}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border bg-background px-3 text-sm font-bold hover:bg-accent"
              >
                <ListChecks className="h-4 w-4" /> Practice
              </Link>
              <Link
                href={tutorHref}
                className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-primary px-3 text-sm font-black text-primary-foreground"
              >
                <BrainCircuit className="h-4 w-4" /> Ask LEO
              </Link>
            </div>
          </div>

          <PresentationDeck
            lesson={lesson}
            subject={subject}
            prevHref={prevHref}
            nextHref={nextHref}
            prevTitle={prevTitle}
            nextTitle={nextTitle}
          />

          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            {prevHref ? (
              <Link
                href={prevHref}
                className="group rounded-2xl border border-border bg-card p-4 shadow-sm transition hover:border-primary/30 hover:bg-accent/35"
              >
                <span className="flex items-center gap-2 text-xs font-black uppercase tracking-wide text-muted-foreground">
                  <ArrowLeft className="h-4 w-4 transition group-hover:-translate-x-1" /> Previous lesson
                </span>
                <span className="mt-2 block font-black">{prevTitle}</span>
              </Link>
            ) : <span />}
            {nextHref ? (
              <Link
                href={nextHref}
                className="group rounded-2xl border border-primary/25 bg-primary/5 p-4 text-right shadow-sm transition hover:border-primary/40 hover:bg-primary/10"
              >
                <span className="flex items-center justify-end gap-2 text-xs font-black uppercase tracking-wide text-primary">
                  Next lesson <ArrowRight className="h-4 w-4 transition group-hover:translate-x-1" />
                </span>
                <span className="mt-2 block font-black">{nextTitle}</span>
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      {mapOpen ? (
        <div className="fixed inset-0 z-[80] xl:hidden" role="dialog" aria-modal="true" aria-label="Lesson map">
          <button
            type="button"
            aria-label="Close lesson map"
            className="absolute inset-0 bg-black/55 backdrop-blur-sm"
            onClick={() => setMapOpen(false)}
          />
          <div className="absolute inset-x-3 bottom-3 top-[max(0.75rem,env(safe-area-inset-top))] overflow-hidden rounded-3xl border border-border bg-card shadow-2xl sm:left-auto sm:w-[430px]">
            <div className="flex items-center justify-between border-b border-border px-4 py-3">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.12em] text-primary">{subject.subjectCode}</p>
                <h2 className="font-black">Lesson map</h2>
              </div>
              <button
                type="button"
                onClick={() => setMapOpen(false)}
                className="grid h-10 w-10 place-items-center rounded-xl border border-border hover:bg-accent"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-4.25rem)] overflow-y-auto p-3">
              <LessonMap
                lessons={filteredLessons}
                subjectCode={subject.subjectCode}
                currentSlug={lesson.slug}
                query={lessonQuery}
                setQuery={setLessonQuery}
                onNavigate={() => setMapOpen(false)}
              />
            </div>
          </div>
        </div>
      ) : null}

      <nav className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 grid grid-cols-4 gap-1 rounded-2xl border border-border bg-card/95 p-1.5 shadow-2xl backdrop-blur-xl sm:hidden" aria-label="Lesson actions">
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold hover:bg-accent"
        >
          <Menu className="h-4 w-4" /> Map
        </button>
        <Link href={practiceHref} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold hover:bg-accent">
          <ListChecks className="h-4 w-4" /> Practice
        </Link>
        <Link href={tutorHref} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl bg-primary text-[10px] font-black text-primary-foreground">
          <BrainCircuit className="h-4 w-4" /> Ask LEO
        </Link>
        {nextHref ? (
          <Link href={nextHref} className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold hover:bg-accent">
            <ArrowRight className="h-4 w-4" /> Next
          </Link>
        ) : (
          <Link href="/materials" className="flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-bold hover:bg-accent">
            <CheckCircle2 className="h-4 w-4" /> Finish
          </Link>
        )}
      </nav>
      <div className="h-20 sm:hidden" aria-hidden="true" />
    </>
  )
}

function LessonMap({
  lessons,
  subjectCode,
  currentSlug,
  query,
  setQuery,
  onNavigate,
}: {
  lessons: LessonMapItem[]
  subjectCode: string
  currentSlug: string
  query: string
  setQuery: (value: string) => void
  onNavigate?: () => void
}) {
  const grouped = useMemo(() => {
    const map = new Map<number, { title: string; lessons: LessonMapItem[] }>()
    for (const item of lessons) {
      const current = map.get(item.unitNumber) ?? { title: item.unitTitle, lessons: [] }
      current.lessons.push(item)
      map.set(item.unitNumber, current)
    }
    return Array.from(map.entries()).sort(([left], [right]) => left - right)
  }, [lessons])

  return (
    <div>
      <label className="relative block">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Find a lesson..."
          className="min-h-10 w-full rounded-xl border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
      </label>

      <div className="mt-3 space-y-4">
        {grouped.map(([unitNumber, unit]) => (
          <section key={unitNumber}>
            <div className="mb-1.5 flex items-center gap-2 px-1">
              <span className="grid h-6 w-6 place-items-center rounded-md bg-primary/10 text-[10px] font-black text-primary">U{unitNumber}</span>
              <h3 className="truncate text-xs font-black text-muted-foreground">{unit.title}</h3>
            </div>
            <div className="space-y-1">
              {unit.lessons.map((item) => {
                const active = item.slug === currentSlug
                return (
                  <Link
                    key={item.slug}
                    href={`/materials/lesson/${encodeURIComponent(subjectCode)}/${encodeURIComponent(item.slug)}`}
                    onClick={onNavigate}
                    aria-current={active ? 'page' : undefined}
                    className={`flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm transition ${
                      active
                        ? 'bg-primary font-black text-primary-foreground shadow-sm'
                        : 'font-semibold hover:bg-accent'
                    }`}
                  >
                    <BookOpen className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate">{item.title}</span>
                    {active ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <ChevronRight className="h-4 w-4 shrink-0 opacity-55" />}
                  </Link>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {!grouped.length ? (
        <div className="px-3 py-10 text-center">
          <Search className="mx-auto h-6 w-6 text-muted-foreground" />
          <p className="mt-2 text-sm font-bold">No matching lesson</p>
        </div>
      ) : null}
    </div>
  )
}
