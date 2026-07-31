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

    save()
    const interval = window.setInterval(() => save(), SAVE_INTERVAL_MS)
    const onPageHide = () => save(true)
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') save(true)
    }

    window.addEventListener('pagehide', onPageHide)
    document.addEventListener('visibilitychange', onVisibilityChange)
    return () => {
      window.clearInterval(interval)
      window.removeEventListener('pagehide', onPageHide)
      document.removeEventListener('visibilitychange', onVisibilityChange)
      save(true)
    }
  }, [fallbackTitle, href, resourceId])

  return null
}
