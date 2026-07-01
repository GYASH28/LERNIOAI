'use client'

import { useEffect, useState, useRef } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Route Loading Bar — only shows when navigation takes >200ms.
 *
 * The previous version faked a 900ms loading bar on EVERY navigation,
 * making the app feel slow even when pages loaded instantly. This version
 * only appears if the page hasn't loaded within 200ms, and disappears
 * the moment the new page renders.
 */
export function RouteLoadingBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const prevPath = useRef(pathname)

  useEffect(() => {
    if (prevPath.current === pathname) return
    prevPath.current = pathname

    // Start a timer — only show the bar if navigation takes >200ms
    timerRef.current = setTimeout(() => setVisible(true), 200)

    // Hide immediately on next render (the new page has loaded)
    requestAnimationFrame(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setVisible(false)
    })

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [pathname])

  if (!visible) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 pointer-events-none"
      role="progressbar"
      aria-label="Loading"
    >
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  )
}
