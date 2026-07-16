'use client'

import dynamic from 'next/dynamic'
import { useEffect } from 'react'
import { usePathname } from 'next/navigation'

// Lazy-load only the essential runtime components.
// Removed: LernioCursor (causes jank on every mouse move)
// Removed: ThemeAtmosphere (heavy animation layer, causes re-renders)
// Kept: AchievementUnlockToaster (lightweight, only renders on unlock)
// Kept: SonnerToaster (needed for toast notifications)
// Kept: DevOverlayCleanup (lightweight DOM cleanup)

const AchievementUnlockToaster = dynamic(
  () => import('@/components/ui/achievement-unlock-toaster').then((module) => module.AchievementUnlockToaster),
  { ssr: false },
)
const SonnerToaster = dynamic(
  () => import('@/components/ui/sonner').then((module) => module.Toaster),
  { ssr: false },
)
const DevOverlayCleanup = dynamic(
  () => import('@/components/dev-overlay-cleanup').then((module) => module.DevOverlayCleanup),
  { ssr: false },
)

const PUBLIC_RUNTIME_ROUTES = new Set([
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/support',
])

function isLearningRuntimeRoute(pathname: string) {
  if (PUBLIC_RUNTIME_ROUTES.has(pathname)) return false
  if (pathname.startsWith('/api/')) return false
  return true
}

/**
 * Micro-improvement: scroll to top on every route change.
 *
 * Next.js App Router preserves scroll position by default for back/forward
 * navigation, but for fresh clicks into a new route the user expects to land
 * at the top of the page. This is a tiny, surgical fix that only fires when
 * the pathname actually changes (not on query-string-only changes), and it
 * runs after the new page has rendered so it doesn't fight the browser's
 * own scroll restoration.
 */
function ScrollToTopOnRouteChange() {
  const pathname = usePathname() || '/'
  useEffect(() => {
    // Don't scroll if there's a hash anchor — let the browser jump to it.
    if (typeof window === 'undefined') return
    if (window.location.hash) return
    // Use 'auto' (instant) instead of 'smooth' — smooth scrolling on route
    // change feels laggy and can make the new page feel slow to appear.
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

export function GlobalExperienceRuntime() {
  const pathname = usePathname() || '/'
  const enableLearningRuntime = isLearningRuntimeRoute(pathname)

  if (!enableLearningRuntime) {
    return (
      <>
        <ScrollToTopOnRouteChange />
        <DevOverlayCleanup />
      </>
    )
  }

  return (
    <>
      <ScrollToTopOnRouteChange />
      <AchievementUnlockToaster />
      <SonnerToaster position="top-right" richColors />
      <DevOverlayCleanup />
    </>
  )
}
