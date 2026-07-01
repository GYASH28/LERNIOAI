'use client'

import { useEffect } from 'react'

interface RecentlyViewedTrackerProps {
  resourceType: string // 'lesson' | 'subject'
  resourceId: string
  title: string
  href: string
}

/**
 * Invisible component that tracks when a user views a lesson/subject.
 * Fires a POST to /api/recently-viewed on mount.
 * Also tracks scroll position before unload.
 */
export function RecentlyViewedTracker({
  resourceType,
  resourceId,
  title,
  href,
}: RecentlyViewedTrackerProps) {
  useEffect(() => {
    // Track the view
    fetch('/api/recently-viewed', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ resourceType, resourceId, title, href, scrollPos: 0 }),
    }).catch(() => {})

    // Track scroll position before unload
    const handleBeforeUnload = () => {
      const scrollPos = window.scrollY
      navigator.sendBeacon(
        '/api/recently-viewed',
        JSON.stringify({ resourceType, resourceId, title, href, scrollPos }),
      )
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [resourceType, resourceId, title, href])

  return null
}
