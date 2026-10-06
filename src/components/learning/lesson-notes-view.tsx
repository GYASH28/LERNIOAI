'use client'

import { useState } from 'react'
import { BookOpen, CheckCircle2, Presentation, Zap } from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MaterialsLessonRenderer } from '@/components/learning/materials-lesson-renderer'
import { PresentationDeck } from '@/components/learning/presentation-deck'
import { MarkdownRenderer } from '@/components/learning/markdown-renderer'
import { MiniFlashcardGrid } from '@/components/learning/mini-flashcard'
import { cn } from '@/lib/utils'

type ViewMode = 'read' | 'slides' | 'quick'

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

  const shared = {
    lesson,
    subject,
    prevHref,
    nextHref,
    prevTitle,
    nextTitle,
  }

  return (
    <div>
      <div className="no-print mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-2">
        <div className="px-2">
          <p className="text-sm font-semibold">Choose how you want to study</p>
          <p className="text-xs text-muted-foreground">
            Read for continuous notes, or switch to Slides for focused revision.
          </p>
        </div>
        <div className="grid grid-cols-3 rounded-lg bg-muted p-1" role="tablist" aria-label="Notes view">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'read'}
            onClick={() => setMode('read')}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition',
              mode === 'read'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <BookOpen className="h-4 w-4" />
            Read
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'slides'}
            onClick={() => setMode('slides')}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition',
              mode === 'slides'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Presentation className="h-4 w-4" />
            Slides
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'quick'}
            onClick={() => setMode('quick')}
            className={cn(
              'inline-flex min-h-10 items-center justify-center gap-2 rounded-md px-3 text-sm font-semibold transition',
              mode === 'quick'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Zap className="h-4 w-4" />
            Quick
          </button>
        </div>
      </div>

      {mode === 'read' ? (
        <MaterialsLessonRenderer {...shared} />
      ) : mode === 'slides' ? (
        <PresentationDeck {...shared} />
      ) : (
        <QuickRevision lesson={lesson} />
      )}
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
