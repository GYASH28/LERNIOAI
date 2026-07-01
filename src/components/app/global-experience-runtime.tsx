'use client'

import dynamic from 'next/dynamic'
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

export function GlobalExperienceRuntime() {
  const pathname = usePathname() || '/'
  const enableLearningRuntime = isLearningRuntimeRoute(pathname)

  if (!enableLearningRuntime) {
    return <DevOverlayCleanup />
  }

  return (
    <>
      <AchievementUnlockToaster />
      <SonnerToaster position="top-right" richColors />
      <DevOverlayCleanup />
    </>
  )
}
