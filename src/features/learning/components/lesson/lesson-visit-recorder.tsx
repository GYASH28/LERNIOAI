'use client'

import { useEffect } from 'react'
import type { LessonModeKey } from '@/features/learning/server/get-lesson-studio'

const MODE_KEYS = new Set(['learn', 'simplify', 'visualise', 'practise', 'revise'])

interface LessonVisitRecorderProps {
  lessonId: string
  mode?: LessonModeKey
}

export function LessonVisitRecorder({ lessonId, mode = 'learn' }: LessonVisitRecorderProps) {
  useEffect(() => {
    const hashMode = window.location.hash.replace(/^#mode-/, '')
    const resolvedMode = MODE_KEYS.has(hashMode) ? hashMode : mode

    void fetch('/api/progress/lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        lessonId,
        mode: resolvedMode,
        progress: 0,
        completed: false,
      }),
    }).catch(() => undefined)
  }, [lessonId, mode])

  return null
}
