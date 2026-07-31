'use client'

import { useEffect } from 'react'

interface RecentLearningBeaconProps {
  href: string
  resourceId: string
  fallbackTitle: string
}

const SAVE_INTERVAL_MS = 12_000

/**
 * Records the exact lesson route and latest reading position without blocking
 * lesson rendering. The Learn home can then resume the real page instead of
 * linking its primary action back to itself.
 */
export function RecentLearningBeacon({
  href,
  resourceId,
  fallbackTitle,
}: RecentLearningBeaconProps) {
  useEffect(() => {
    let lastSavedScroll = -1

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

    const interval = window.setInterval(() => save(), SAVE_INTERVAL_MS)
    const onPageHide = () => save(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save(true)
    }

    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearTimeout(initialSaveTimer)
      window.clearTimeout(restoreTimer)
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      save(true)
    }
  }, [fallbackTitle, href, resourceId])

  return null
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
