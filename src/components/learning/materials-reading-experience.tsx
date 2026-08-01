'use client'

import { useEffect, useMemo, useState, useSyncExternalStore } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  BrainCircuit,
  CheckCircle2,
  ChevronRight,
  Eye,
  ListChecks,
  Menu,
  PenTool,
  RotateCcw,
  Search,
  Presentation,
  Sparkles,
  X,
} from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { PresentationDeck } from '@/components/learning/presentation-deck'
import { MaterialsLessonRenderer } from '@/components/learning/materials-lesson-renderer'
import {
  MATERIALS_PHASES,
  getAvailableMaterialsPhases,
  getMaterialsPhase,
  type MaterialsPhaseId,
} from '@/lib/curriculum/materials-learning-phases'

interface LessonMapItem {
  slug: string
  title: string
  unitNumber: number
  unitTitle: string
  durationMin: number
}

const PHASE_ICONS = {
  learn: BookOpen,
  simplify: Sparkles,
  visualise: Eye,
  practise: PenTool,
  revise: RotateCcw,
} satisfies Record<MaterialsPhaseId, typeof BookOpen>

const MATERIALS_PHASE_STORAGE_KEY = 'lernio:materials:phase'
const MATERIALS_PHASE_CHANGE_EVENT = 'lernio:materials:phase-change'

function subscribeToMaterialsPhase(onStoreChange: () => void) {
  window.addEventListener('storage', onStoreChange)
  window.addEventListener(MATERIALS_PHASE_CHANGE_EVENT, onStoreChange)
  return () => {
    window.removeEventListener('storage', onStoreChange)
    window.removeEventListener(MATERIALS_PHASE_CHANGE_EVENT, onStoreChange)
  }
}

function getMaterialsPhaseSnapshot(): MaterialsPhaseId {
  try {
    return getMaterialsPhase(window.localStorage.getItem(MATERIALS_PHASE_STORAGE_KEY)).id
  } catch {
    return 'learn'
  }
}

function getServerMaterialsPhaseSnapshot(): MaterialsPhaseId {
  return 'learn'
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
  const availablePhases = useMemo(() => getAvailableMaterialsPhases(lesson), [lesson])
  const storedPhaseId = useSyncExternalStore(
    subscribeToMaterialsPhase,
    getMaterialsPhaseSnapshot,
    getServerMaterialsPhaseSnapshot,
  )
  const activePhaseId = availablePhases.includes(storedPhaseId)
    ? storedPhaseId
    : availablePhases[0] ?? 'learn'
  const [displayMode, setDisplayMode] = useState<'phases' | 'slides'>('phases')

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

  const activePhase = availablePhases.includes(activePhaseId)
    ? getMaterialsPhase(activePhaseId)
    : getMaterialsPhase(availablePhases[0])
  const activePhaseIndex = MATERIALS_PHASES.findIndex((phase) => phase.id === activePhase.id)
  const nextAvailablePhase = MATERIALS_PHASES
    .slice(activePhaseIndex + 1)
    .find((phase) => availablePhases.includes(phase.id))

  const selectPhase = (phaseId: MaterialsPhaseId) => {
    if (!availablePhases.includes(phaseId)) return
    setDisplayMode('phases')
    try {
      window.localStorage.setItem(MATERIALS_PHASE_STORAGE_KEY, phaseId)
    } catch {
      // The learning path remains usable when storage is unavailable.
    }
    window.dispatchEvent(new Event(MATERIALS_PHASE_CHANGE_EVENT))
  }

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

          <section className="overflow-hidden rounded-[1.75rem] border border-border/80 bg-card shadow-xl shadow-primary/5">
            <div className="border-b border-border/75 bg-gradient-to-br from-primary/10 via-card to-card px-3 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5">
              <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
                <div className="max-w-2xl">
                  <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Five-phase learning path</p>
                  <h2 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">Study with a purpose, not a wall of notes</h2>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">Each phase uses a different part of this lesson. Move in order, or jump to what you need right now.</p>
                </div>
                <button
                  type="button"
                  onClick={() => setDisplayMode((current) => current === 'slides' ? 'phases' : 'slides')}
                  aria-pressed={displayMode === 'slides'}
                  className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border px-4 text-sm font-black transition active:scale-[0.98] ${
                    displayMode === 'slides'
                      ? 'border-primary bg-primary text-primary-foreground'
                      : 'border-border bg-background hover:border-primary/35 hover:bg-accent'
                  }`}
                >
                  <Presentation className="h-4 w-4" />
                  {displayMode === 'slides' ? 'Return to phases' : 'Presentation mode'}
                </button>
              </div>

              <nav className="mt-4 flex snap-x gap-2 overflow-x-auto pb-1 sm:grid sm:grid-cols-5 sm:overflow-visible sm:pb-0" aria-label="Five learning phases">
                {MATERIALS_PHASES.map((phase, index) => {
                  const available = availablePhases.includes(phase.id)
                  const active = displayMode === 'phases' && activePhase.id === phase.id
                  const PhaseIcon = PHASE_ICONS[phase.id]
                  return (
                    <button
                      key={phase.id}
                      type="button"
                      disabled={!available}
                      onClick={() => selectPhase(phase.id)}
                      aria-current={active ? 'step' : undefined}
                      className={`group min-h-[4.6rem] min-w-[8.75rem] snap-start rounded-xl border px-3 py-2.5 text-left transition active:scale-[0.98] sm:min-w-0 ${
                        active
                          ? 'border-primary bg-primary text-primary-foreground shadow-lg shadow-primary/15'
                          : available
                            ? 'border-border/80 bg-background/85 hover:-translate-y-0.5 hover:border-primary/30 hover:bg-accent/60'
                            : 'cursor-not-allowed border-border/45 bg-muted/35 text-muted-foreground opacity-55'
                      }`}
                    >
                      <span className="flex items-center justify-between gap-2">
                        <span className={`grid h-7 w-7 place-items-center rounded-lg ${active ? 'bg-white/15' : 'bg-primary/10 text-primary'}`}>
                          <PhaseIcon className="h-3.5 w-3.5" />
                        </span>
                        <span className="text-[10px] font-black tabular-nums opacity-70">0{index + 1}</span>
                      </span>
                      <span className="mt-1.5 block text-sm font-black">{phase.label}</span>
                      <span className="mt-0.5 block truncate text-[10px] font-semibold opacity-70">{available ? phase.eyebrow : 'Content pending'}</span>
                    </button>
                  )
                })}
              </nav>
            </div>

            {displayMode === 'slides' ? (
              <div className="p-2 sm:p-4">
                <PresentationDeck
                  lesson={lesson}
                  subject={subject}
                  prevHref={prevHref}
                  nextHref={nextHref}
                  prevTitle={prevTitle}
                  nextTitle={nextTitle}
                />
              </div>
            ) : (
              <div className="p-3 sm:p-5 lg:p-7">
                <header className="mb-6 grid gap-3 border-b border-border/70 pb-5 sm:grid-cols-[auto_1fr] sm:items-start">
                  <div className="grid h-12 w-12 place-items-center rounded-2xl bg-primary/10 text-primary">
                    {(() => {
                      const ActiveIcon = PHASE_ICONS[activePhase.id]
                      return <ActiveIcon className="h-5 w-5" />
                    })()}
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.16em] text-primary">Phase {activePhaseIndex + 1} · {activePhase.eyebrow}</p>
                    <h3 className="mt-1 text-2xl font-black tracking-tight">{activePhase.label}</h3>
                    <p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{activePhase.description}</p>
                  </div>
                </header>

                <MaterialsLessonRenderer
                  lesson={lesson}
                  subject={subject}
                  sectionIds={activePhase.sectionIds}
                  showFooterNavigation={false}
                />

                {nextAvailablePhase ? (
                  <div className="mt-8 flex flex-col gap-3 rounded-2xl bg-muted/55 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-xs font-black uppercase tracking-[0.13em] text-muted-foreground">Next phase</p>
                      <p className="mt-1 font-black">{nextAvailablePhase.label}: {nextAvailablePhase.eyebrow}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => selectPhase(nextAvailablePhase.id)}
                      className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground transition hover:brightness-105 active:scale-[0.98]"
                    >
                      Continue to {nextAvailablePhase.label} <ArrowRight className="h-4 w-4" />
                    </button>
                  </div>
                ) : null}
              </div>
            )}
          </section>

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
