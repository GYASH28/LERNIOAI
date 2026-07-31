'use client'

import dynamic from 'next/dynamic'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const GlobalExperienceRuntime = dynamic(
  () => import('@/components/app/global-experience-runtime').then((module) => module.GlobalExperienceRuntime),
  { ssr: false },
)
const StudentMobileDock = dynamic(
  () => import('@/components/student-os/student-mobile-dock').then((module) => module.StudentMobileDock),
  { ssr: false },
)
const StudentOSLauncher = dynamic(
  () => import('@/components/student-os/student-os-launcher').then((module) => module.StudentOSLauncher),
  { ssr: false },
)
const SelectionLearningTools = dynamic(
  () => import('@/components/student-os/selection-learning-tools').then((module) => module.SelectionLearningTools),
  { ssr: false },
)
const CommandPalette = dynamic(
  () => import('@/components/ui/command-palette').then((module) => module.CommandPalette),
  { ssr: false },
)
const KeyboardShortcuts = dynamic(
  () => import('@/components/app/keyboard-shortcuts').then((module) => module.KeyboardShortcuts),
  { ssr: false },
)
const RegisterSW = dynamic(
  () => import('@/components/app/register-sw').then((module) => module.RegisterSW),
  { ssr: false },
)

const PUBLIC_PREFIXES = [
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/verify-email',
  '/privacy',
  '/terms',
  '/support',
]

function isPublicRoute(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function GlobalClientRuntime() {
  const pathname = usePathname() || '/'
  const publicRoute = isPublicRoute(pathname)
  const [idleReady, setIdleReady] = useState(false)

  useEffect(() => {
    setIdleReady(false)
    const browser = window as Window & {
      requestIdleCallback?: (callback: IdleRequestCallback, options?: IdleRequestOptions) => number
      cancelIdleCallback?: (handle: number) => void
    }

    if (browser.requestIdleCallback) {
      const handle = browser.requestIdleCallback(() => setIdleReady(true), { timeout: 1200 })
      return () => browser.cancelIdleCallback?.(handle)
    }

    const timer = window.setTimeout(() => setIdleReady(true), 350)
    return () => window.clearTimeout(timer)
  }, [pathname])

  return (
    <>
      <GlobalExperienceRuntime />
      {!publicRoute && <StudentMobileDock />}
      {idleReady && <RegisterSW />}
      {!publicRoute && idleReady && (
        <>
          <StudentOSLauncher />
          <SelectionLearningTools />
          <CommandPalette />
          <KeyboardShortcuts />
        </>
      )}
    </>
  )
}
