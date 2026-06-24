'use client'

import { useCallback } from 'react'
import { useMotionContext } from './motion-provider'
import type { ThemePrefUpdate } from '@/lib/theme-types'

export function useThemeSwitchTransition(setPref: (pref: ThemePrefUpdate) => void) {
  const { policy, signature } = useMotionContext()

  return useCallback(
    (pref: ThemePrefUpdate) => {
      const documentWithTransition = document as Document & {
        startViewTransition?: (callback: () => void) => { finished: Promise<void> }
      }

      if (policy.level === 'none' || !documentWithTransition.startViewTransition) {
        setPref(pref)
        return
      }

      document.documentElement.setAttribute('data-theme-switch', signature.themeSwitch.kind)
      const transition = documentWithTransition.startViewTransition(() => setPref(pref))
      transition.finished.finally(() => {
        document.documentElement.removeAttribute('data-theme-switch')
      })
    },
    [policy.level, setPref, signature.themeSwitch.kind],
  )
}
