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

    // Track scroll position before unload — sendBeacon with explicit
    // Content-Type: application/json so the server-side req.json() parser
    // accepts the payload (sendBeacon defaults to text/plain which would
    // cause a 400 "Invalid request body" from parseBody()).
    const handleBeforeUnload = () => {
      const scrollPos = window.scrollY
      const blob = new Blob(
        [JSON.stringify({ resourceType, resourceId, title, href, scrollPos })],
        { type: 'application/json' },
      )
      navigator.sendBeacon('/api/recently-viewed', blob)
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [resourceType, resourceId, title, href])

  return null
}
