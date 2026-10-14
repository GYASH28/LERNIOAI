'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Display progress while navigation is actually pending, not after the next
 * route has already rendered. Works for mouse and keyboard-activated links.
 * Never block navigation, and clear stale indicators after interrupted routes.
 */
export function RouteLoadingBar() {
  const pathname = usePathname()
  const [visible, setVisible] = useState(false)
  const showTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const safetyTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function clearPending() {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
      showTimer.current = null
      safetyTimer.current = null
      setVisible(false)
    }

    function startPending() {
      if (showTimer.current) clearTimeout(showTimer.current)
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
      setVisible(false)
      showTimer.current = setTimeout(() => setVisible(true), 200)
      // Network failures or cancelled navigations cannot leave a permanent bar.
      safetyTimer.current = setTimeout(clearPending, 12000)
    }

    function handleClick(event: MouseEvent) {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey ||
          event.ctrlKey || event.shiftKey || event.altKey) return
      if (!(event.target instanceof Element)) return
      const anchor = event.target.closest('a[href]')
      if (!anchor || anchor.hasAttribute('download')) return
      if (anchor.getAttribute('target') && anchor.getAttribute('target') !== '_self') return
      const href = anchor.getAttribute('href')
      if (!href || href.startsWith('#') || href.startsWith('mailto:') || href.startsWith('tel:')) return
      let target: URL
      try {
        target = new URL(href, window.location.href)
      } catch {
        return
      }
      if (target.origin !== window.location.origin ||
          target.pathname === window.location.pathname) return
      startPending()
    }

    // Capture the intent before Next.js resolves the new pathname.
    document.addEventListener('click', handleClick, true)
    window.addEventListener('popstate', startPending)
    return () => {
      document.removeEventListener('click', handleClick, true)
      window.removeEventListener('popstate', startPending)
      if (showTimer.current) clearTimeout(showTimer.current)
      if (safetyTimer.current) clearTimeout(safetyTimer.current)
    }
  }, [])

  // When navigation settles, usePathname changes. Stop immediately.
  useEffect(() => {
    if (showTimer.current) clearTimeout(showTimer.current)
    if (safetyTimer.current) clearTimeout(safetyTimer.current)
    showTimer.current = null
    safetyTimer.current = null
    setVisible(false)
  }, [pathname])

  if (!visible) return null

  return (
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[60] h-0.5 overflow-hidden bg-primary/10"
      role="progressbar" aria-label="Loading next page">
      <div className="h-full w-1/3 animate-pulse bg-primary" />
    </div>
  )
}
