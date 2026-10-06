'use client'

import { useState } from 'react'
import { BookOpen, Presentation } from 'lucide-react'
import type { Lesson, SubjectNotes } from '@/lib/curriculum/lesson-notes-loader'
import { MaterialsLessonRenderer } from '@/components/learning/materials-lesson-renderer'
import { PresentationDeck } from '@/components/learning/presentation-deck'
import { cn } from '@/lib/utils'

type ViewMode = 'read' | 'slides'

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
        <div className="grid grid-cols-2 rounded-lg bg-muted p-1" role="tablist" aria-label="Notes view">
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
        </div>
      </div>

      {mode === 'read' ? (
        <MaterialsLessonRenderer {...shared} />
      ) : (
        <PresentationDeck {...shared} />
      )}
    </div>
  )
}
