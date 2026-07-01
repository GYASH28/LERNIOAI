'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Route Loading Bar.
 *
 * Shows a thin progress bar at the top of the page during route
 * transitions — the same UX pattern used by YouTube, GitHub, and NProgress.
 * Eliminates the "did I click?" uncertainty during navigation.
 */
export function RouteLoadingBar() {
  const pathname = usePathname()
  const [isLoading, setIsLoading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    // On pathname change, show the bar briefly then complete.
    setIsLoading(true)
    setProgress(15)

    const tick1 = setTimeout(() => setProgress(45), 100)
    const tick2 = setTimeout(() => setProgress(75), 300)
    const tick3 = setTimeout(() => setProgress(95), 600)
    const done = setTimeout(() => {
      setProgress(100)
      setTimeout(() => {
        setIsLoading(false)
        setProgress(0)
      }, 200)
    }, 900)

    return () => {
      clearTimeout(tick1)
      clearTimeout(tick2)
      clearTimeout(tick3)
      clearTimeout(done)
    }
  }, [pathname])

  if (!isLoading && progress === 0) return null

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[60] h-0.5 bg-transparent pointer-events-none"
      role="progressbar"
      aria-valuenow={progress}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Page loading"
    >
      <div
        className="h-full bg-primary transition-all duration-300 ease-out"
        style={{ width: `${progress}%`, opacity: progress > 0 ? 1 : 0 }}
      />
    </div>
  )
}
