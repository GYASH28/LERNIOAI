'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { RouteVisualLayer } from '@/components/app/route-visual-layer'

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
const PageTransitionStory = dynamic(
  () => import('@/components/app/page-transition-story').then((module) => module.PageTransitionStory),
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
      <RouteVisualLayer />
      <PageTransitionStory />
      <AchievementUnlockToaster />
      <SonnerToaster position="top-right" richColors />
      <DevOverlayCleanup />
    </>
  )
}
