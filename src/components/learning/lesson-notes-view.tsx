'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { BookOpen, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, EyeOff, Focus, ListTree, Play, Presentation, Type, Zap } from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MaterialsLessonRenderer } from '@/components/learning/materials-lesson-renderer'
import { PresentationDeck } from '@/components/learning/presentation-deck'
import { MarkdownRenderer } from '@/components/learning/markdown-renderer'
import { MiniFlashcardGrid } from '@/components/learning/mini-flashcard'
import { LessonVideos } from '@/components/learning/lesson-videos'
import { cn } from '@/lib/utils'

type ViewMode = 'read' | 'slides' | 'quick' | 'videos'

const STUDY_MODES = [
  { id: 'read' as const, label: 'Read', icon: BookOpen, detail: 'Complete notes' },
  { id: 'slides' as const, label: 'Slides', icon: Presentation, detail: 'One concept at a time' },
  { id: 'quick' as const, label: 'Revise', icon: Zap, detail: 'Exam essentials' },
  { id: 'videos' as const, label: 'Videos', icon: Play, detail: 'Watch or find a lesson' },
]

export function LessonNotesView({
  lesson,
  subject,
  prevHref,
  nextHref,
  prevTitle,
  nextTitle,
}: {
  lesson: Lesson
  subject: SubjectNotes
  prevHref?: string | null
  nextHref?: string | null
  prevTitle?: string | null
  nextTitle?: string | null
}) {
  const [mode, setMode] = useState<ViewMode>('read')
  const [focusMode, setFocusMode] = useState(false)
  const [largeText, setLargeText] = useState(false)
  const [showMobileOutline, setShowMobileOutline] = useState(false)
  const lessons = useMemo(
    () => subject.units.flatMap((unit) => unit.lessons.map((entry) => ({ ...entry, unitNumber: unit.number }))),
    [subject],
  )
  const currentIndex = lessons.findIndex((entry) => entry.slug === lesson.slug)
  const currentNumber = Math.max(0, currentIndex) + 1
  const lessonCount = lessons.length
  const percentage = lessonCount ? Math.round((currentNumber / lessonCount) * 100) : 0

  // Persist reader preferences; defer localStorage reads until after hydration.
  useEffect(() => {
    try {
      setFocusMode(localStorage.getItem('lernio:notes:focus') === 'true')
      setLargeText(localStorage.getItem('lernio:notes:large') === 'true')
    } catch {
      // Private browsing may disable storage; the reader still works normally.
    }
  }, [])

  function toggleFocus() {
    const next = !focusMode
    setFocusMode(next)
    try { localStorage.setItem('lernio:notes:focus', String(next)) } catch {}
  }

  function toggleTextSize() {
    const next = !largeText
    setLargeText(next)
    try { localStorage.setItem('lernio:notes:large', String(next)) } catch {}
  }

  const shared = { lesson, subject, prevHref, nextHref, prevTitle, nextTitle }

  const outline = (
    <nav aria-label="Subject lesson outline" className="space-y-4">
      {subject.units.map((unit) => (
        <div key={unit.number}>
          <p className="mb-2 px-2 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
            Unit {unit.number} · {unit.title}
          </p>
          <div className="space-y-1">
            {unit.lessons.map((item) => {
              const active = item.slug === lesson.slug
              return (
                <Link
                  key={item.slug}
                  href={`/materials/lesson/${encodeURIComponent(subject.subjectCode)}/${encodeURIComponent(item.slug)}`}
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setShowMobileOutline(false)}
                  className={cn(
                    'flex items-start gap-2.5 rounded-lg px-3 py-2.5 text-sm leading-5 transition-colors',
                    active
                      ? 'bg-primary/10 font-semibold text-primary ring-1 ring-primary/15'
                      : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                  )}
                >
                  <span className={cn('mt-0.5 h-2 w-2 shrink-0 rounded-full', active ? 'bg-primary' : 'bg-border')} />
                  <span>{item.title}</span>
                </Link>
              )
            })}
          </div>
        </div>
      ))}
    </nav>
  )

  return (
    <div className={cn('mx-auto w-full', focusMode ? 'max-w-4xl' : 'max-w-[1440px]')}>
      <div className="mb-5 overflow-hidden rounded-2xl border border-border/80 bg-card">
        <div className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
            <BookOpen className="h-4 w-4" />
            {subject.subjectName}
            <span className="text-muted-foreground">·</span>
            Lesson {currentNumber} / {lessonCount}
          </div>
          <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
            <h1 className="max-w-3xl text-xl font-bold tracking-tight text-foreground sm:text-2xl lg:text-3xl">
              {lesson.title}
            </h1>
            <div className="flex items-center gap-2">
              <button type="button" onClick={toggleTextSize}
                aria-pressed={largeText}
                className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition', largeText ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}
                title="Adjust reading text size">
                <Type className="h-4 w-4" /> {largeText ? 'Larger' : 'Text'}
              </button>
              <button type="button" onClick={toggleFocus}
                aria-pressed={focusMode}
                className={cn('inline-flex min-h-10 items-center gap-1.5 rounded-lg border px-3 text-xs font-semibold transition', focusMode ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-muted')}>
                {focusMode ? <EyeOff className="h-4 w-4" /> : <Focus className="h-4 w-4" />}
                {focusMode ? 'Exit focus' : 'Focus'}
              </button>
            </div>
          </div>
          <div className="mt-4 flex items-center justify-between gap-4 text-xs text-muted-foreground">
            <span>Study path progress</span>
            <span>{percentage}% · {lessonCount - currentNumber} lessons after this</span>
          </div>
          <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-muted">
            <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${percentage}%` }} />
          </div>
        </div>
        <div className="grid grid-cols-4 gap-1 border-t border-border p-1.5 sm:gap-2 sm:p-2" role="tablist" aria-label="Study format">
          {STUDY_MODES.map((item) => (
            <button
              key={item.id}
              id={`study-tab-${item.id}`}
              type="button"
              role="tab"
              aria-selected={mode === item.id}
              aria-controls="study-panel"
              onClick={() => setMode(item.id)}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-1 rounded-xl px-1 py-2 text-xs font-semibold transition sm:flex-row sm:gap-2 sm:text-sm',
                mode === item.id
                  ? 'bg-primary text-primary-foreground shadow-sm'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground',
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              <span>{item.label}</span>
            </button>
          ))}
        </div>
      </div>

      {!focusMode && (
        <button
          type="button"
          className="mb-4 flex min-h-11 w-full items-center justify-between rounded-xl border border-border bg-card px-4 text-sm font-semibold lg:hidden"
          aria-expanded={showMobileOutline}
          onClick={() => setShowMobileOutline((value) => !value)}
        >
          <span className="flex items-center gap-2"><ListTree className="h-4 w-4" /> Browse all lessons</span>
          <ChevronDown className={cn('h-4 w-4 transition-transform', showMobileOutline && 'rotate-180')} />
        </button>
      )}
      {!focusMode && showMobileOutline && (
        <div className="mb-4 max-h-96 overflow-y-auto rounded-xl border border-border bg-card p-4 lg:hidden">
          {outline}
        </div>
      )}

      <div className={cn('grid items-start gap-6', !focusMode && 'lg:grid-cols-[250px_minmax(0,1fr)]')}>
        {!focusMode && (
          <aside className="sticky top-20 hidden max-h-[calc(100vh-7rem)] overflow-y-auto rounded-2xl border border-border/70 bg-card p-4 lg:block">
            <div className="mb-4 flex items-center gap-2 border-b border-border pb-3 text-sm font-semibold">
              <ListTree className="h-4 w-4 text-primary" /> Course outline
            </div>
            {outline}
          </aside>
        )}

        <div className="min-w-0">
          <div
            id="study-panel"
            role="tabpanel"
            aria-labelledby={`study-tab-${mode}`}
            className={cn(
              'min-w-0 rounded-2xl border border-border/80 bg-card p-3 shadow-sm sm:p-6 lg:p-8',
              largeText && '[&_.materials-lesson-prose]:text-lg [&_.materials-lesson-prose]:leading-8 [&_.materials-concept-card]:text-base',
            )}
          >
            {mode === 'read' ? (
              <MaterialsLessonRenderer {...shared} />
            ) : mode === 'slides' ? (
              <PresentationDeck {...shared} />
            ) : mode === 'quick' ? (
              <QuickRevision lesson={lesson} />
            ) : (
              <LessonVideos lesson={lesson} subject={subject} />
            )}
          </div>
          {mode !== 'read' && mode !== 'slides' && (
            <nav aria-label="Adjacent lessons" className="mt-4 flex flex-wrap gap-3">
              {prevHref && <Link href={prevHref} className="inline-flex min-h-11 flex-1 items-center gap-2 rounded-xl border border-border bg-card px-4 text-sm font-medium hover:bg-muted"><ChevronLeft className="h-4 w-4" />{prevTitle || 'Previous lesson'}</Link>}
              {nextHref && <Link href={nextHref} className="inline-flex min-h-11 flex-1 items-center justify-end gap-2 rounded-xl border border-border bg-card px-4 text-right text-sm font-medium hover:bg-muted">{nextTitle || 'Next lesson'}<ChevronRight className="h-4 w-4" /></Link>}
            </nav>
          )}
        </div>
      </div>
    </div>
  )
}

function QuickRevision({ lesson }: { lesson: Lesson }) {
  const quickPoints =
    lesson.cheatSheet?.length
      ? lesson.cheatSheet
      : lesson.keyConcepts?.length
        ? lesson.keyConcepts
        : lesson.examTips

  return (
    <article className="space-y-5">
      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-5">
        <div className="mb-3 flex items-center gap-2">
          <Zap className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-bold">Quick Revision</h2>
        </div>
        {lesson.revisionSummary ? (
          <MarkdownRenderer content={lesson.revisionSummary} />
        ) : (
          <p className="text-sm leading-6 text-muted-foreground">{lesson.overview}</p>
        )}
      </section>

      {quickPoints?.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Must remember
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {quickPoints.map((point, index) => (
              <div key={index} className="flex items-start gap-2 rounded-lg bg-muted/50 p-3 text-sm">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                <span>{point}</span>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      {lesson.formulas?.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Formulas & syntax
          </h3>
          <div className="grid gap-2 sm:grid-cols-2">
            {lesson.formulas.map((formula, index) => (
              <code key={index} className="rounded-lg border border-border bg-muted/40 p-3 text-sm">
                {formula}
              </code>
            ))}
          </div>
        </section>
      ) : null}

      {lesson.examTips?.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Exam tips
          </h3>
          <ul className="space-y-2 text-sm">
            {lesson.examTips.map((tip, index) => (
              <li key={index} className="flex items-start gap-2">
                <Zap className="mt-0.5 h-4 w-4 shrink-0 text-amber-500" />
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {lesson.flashcards?.length ? (
        <section className="rounded-2xl border border-border bg-card p-5">
          <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-muted-foreground">
            Flashcards
          </h3>
          <MiniFlashcardGrid cards={lesson.flashcards} />
        </section>
      ) : null}
    </article>
  )
}
