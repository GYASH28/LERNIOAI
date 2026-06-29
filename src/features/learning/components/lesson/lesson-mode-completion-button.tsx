'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Loader2 } from 'lucide-react'
import type { LessonModeKey } from '@/features/learning/server/get-lesson-studio'

interface LessonModeCompletionButtonProps {
  lessonId: string
  mode: LessonModeKey
  completed: boolean
  available: boolean
}

export function LessonModeCompletionButton({
  lessonId,
  mode,
  completed,
  available,
}: LessonModeCompletionButtonProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const busy = isPending

  async function completeMode() {
    setError(null)
    startTransition(async () => {
      try {
        const response = await fetch('/api/progress/lesson', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            lessonId,
            mode,
            progress: 100,
            completed: true,
          }),
        })
        const payload = await response.json().catch(() => null) as {
          error?: { message?: string }
        } | null
        if (!response.ok) {
          setError(payload?.error?.message ?? 'Completion criteria are not met yet.')
          return
        }
        router.refresh()
      } catch {
        setError('Progress could not be saved. Try again when the connection is stable.')
      }
    })
  }

  return (
    <div className="grid gap-2">
      <button
        type="button"
        onClick={completeMode}
        disabled={completed || !available || busy}
        className="inline-flex h-10 items-center justify-center gap-2 rounded-md border border-border px-3 text-sm font-medium transition-colors hover:bg-muted disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
        ) : completed ? (
          <CheckCircle2 className="h-4 w-4 text-primary" aria-hidden="true" />
        ) : (
          <CheckCircle2 className="h-4 w-4" aria-hidden="true" />
        )}
        {completed ? 'Done' : busy ? 'Saving' : 'Mark done'}
      </button>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  )
}
