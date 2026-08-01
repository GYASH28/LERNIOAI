'use client'

import { useEffect } from 'react'
import { updateLocalStudentState } from '@/components/student-os/use-local-state'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

interface RecentLearningBeaconProps {
  href: string
  resourceId: string
  fallbackTitle: string
}

interface MissionState {
  date: string
  completed: string[]
}

const SAVE_INTERVAL_MS = 12_000
const ENGAGEMENT_CHECK_MS = 5_000
const MIN_ENGAGED_MS = 45_000
const FORCE_ENGAGED_MS = 90_000

/**
 * Records the exact lesson route and latest reading position without blocking
 * lesson rendering. It also completes the Learn mission only after meaningful
 * engagement, preventing a quick accidental page open from counting as study.
 */
export function RecentLearningBeacon({
  href,
  resourceId,
  fallbackTitle,
}: RecentLearningBeaconProps) {
  useEffect(() => {
    let lastSavedScroll = -1
    let missionRecorded = false
    const startedAt = performance.now()

    const save = (keepalive = false) => {
      const scrollPos = Math.max(0, Math.round(window.scrollY))
      if (!keepalive && scrollPos === lastSavedScroll) return
      lastSavedScroll = scrollPos
      const heading = document.querySelector('main h1, h1')?.textContent?.trim()
      const title = heading || fallbackTitle

      void fetch('/api/learning/recent', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resourceType: 'lesson',
          resourceId,
          title,
          href,
          scrollPos,
        }),
        keepalive,
      }).catch(() => {
        // Tracking is helpful but must never interrupt the lesson experience.
      })
    }

    const recordEngagement = () => {
      if (missionRecorded || document.visibilityState !== 'visible') return
      const elapsed = performance.now() - startedAt
      const documentHeight = Math.max(
        document.documentElement.scrollHeight,
        document.body.scrollHeight,
      )
      const scrollable = Math.max(1, documentHeight - window.innerHeight)
      const progress = Math.min(1, Math.max(0, window.scrollY / scrollable))
      const shortLesson = documentHeight <= window.innerHeight * 1.5
      const meaningfullyRead = progress >= 0.25 || shortLesson

      if ((elapsed >= MIN_ENGAGED_MS && meaningfullyRead) || elapsed >= FORCE_ENGAGED_MS) {
        missionRecorded = true
        markMissionComplete('continue-lesson')
      }
    }

    const resumePosition = readResumePosition()
    let initialSaveTimer = 0
    let restoreTimer = 0

    if (resumePosition > 0) {
      restoreTimer = window.setTimeout(() => {
        window.scrollTo({ top: resumePosition, behavior: 'auto' })
        removeResumeParameter()
        initialSaveTimer = window.setTimeout(() => save(), 250)
      }, 300)
    } else {
      initialSaveTimer = window.setTimeout(() => save(), 0)
    }

    const saveInterval = window.setInterval(() => save(), SAVE_INTERVAL_MS)
    const engagementInterval = window.setInterval(recordEngagement, ENGAGEMENT_CHECK_MS)
    const onPageHide = () => {
      recordEngagement()
      save(true)
    }
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        recordEngagement()
        save(true)
      }
    }

    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearTimeout(initialSaveTimer)
      window.clearTimeout(restoreTimer)
      window.clearInterval(saveInterval)
      window.clearInterval(engagementInterval)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      recordEngagement()
      save(true)
    }
  }, [fallbackTitle, href, resourceId])

  return null
}

function markMissionComplete(missionId: string) {
  const today = localDateKey()
  updateLocalStudentState<MissionState>(
    STUDENT_OS_STORAGE.missions,
    { date: today, completed: [] },
    (current) => {
      const completed = current.date === today ? current.completed : []
      return {
        date: today,
        completed: completed.includes(missionId) ? completed : [...completed, missionId],
      }
    },
  )
}

function readResumePosition() {
  const raw = new URLSearchParams(window.location.search).get('resume')
  if (!raw) return 0
  const value = Number(raw)
  if (!Number.isFinite(value) || value <= 0 || value > 10_000_000) return 0
  return Math.round(value)
}

function removeResumeParameter() {
  const url = new URL(window.location.href)
  url.searchParams.delete('resume')
  const cleanUrl = `${url.pathname}${url.search}${url.hash}`
  window.history.replaceState(window.history.state, '', cleanUrl)
}

function localDateKey(date = new Date()) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}
