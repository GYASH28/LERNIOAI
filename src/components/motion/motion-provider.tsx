'use client'

import {
  createContext,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { MotionConfig } from 'framer-motion'
import { usePrefs } from '@/components/theme-provider'
import { useAppStore } from '@/store/app-store'
import { canAnimate, resolveMotionPolicy } from '@/lib/motion/policy'
import { getThemeMotion } from '@/lib/motion/theme-motion'
import type { EffectiveMotionPolicy, MotionCategory, ThemeMotionSignature } from '@/lib/motion/types'
import type { Palette } from '@/lib/theme-types'

interface MotionContextValue {
  policy: EffectiveMotionPolicy
  signature: ThemeMotionSignature
  palette: Palette
  canAnimate: (category: MotionCategory) => boolean
}

const MotionContext = createContext<MotionContextValue | null>(null)

function subscribeReducedMotion(callback: () => void): () => void {
  if (typeof window === 'undefined') return () => {}
  const query = window.matchMedia('(prefers-reduced-motion: reduce)')
  query.addEventListener('change', callback)
  return () => query.removeEventListener('change', callback)
}

function getReducedMotionSnapshot(): boolean {
  if (typeof window === 'undefined') return false
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function subscribeVisibility(callback: () => void): () => void {
  if (typeof document === 'undefined') return () => {}
  document.addEventListener('visibilitychange', callback)
  return () => document.removeEventListener('visibilitychange', callback)
}

function getVisibilitySnapshot(): boolean {
  if (typeof document === 'undefined') return true
  return document.visibilityState === 'visible'
}

export function LernioMotionProvider({ children }: { children: ReactNode }) {
  const { pref } = usePrefs()
  const strictExam = useAppStore((state) => state.view === 'exams')
  const osReducedMotion = useSyncExternalStore(
    subscribeReducedMotion,
    getReducedMotionSnapshot,
    () => false,
  )
  const tabVisible = useSyncExternalStore(
    subscribeVisibility,
    getVisibilitySnapshot,
    () => true,
  )

  const policy = useMemo(
    () =>
      resolveMotionPolicy({
        userMotion: pref.motion,
        osReducedMotion,
        lowPower: pref.lowPower,
        strictExam,
        tabVisible,
        highContrast: pref.contrast === 'high',
      }),
    [pref.motion, pref.lowPower, pref.contrast, osReducedMotion, strictExam, tabVisible],
  )

  const signature = useMemo(() => getThemeMotion(pref.palette), [pref.palette])

  const value = useMemo<MotionContextValue>(
    () => ({
      policy,
      signature,
      palette: pref.palette,
      canAnimate: (category) => canAnimate(policy, category),
    }),
    [policy, signature, pref.palette],
  )

  return (
    <MotionConfig
      reducedMotion={policy.level === 'full' ? 'never' : 'always'}
      transition={{ duration: 0.2 * policy.durationScale }}
    >
      <MotionContext.Provider value={value}>{children}</MotionContext.Provider>
    </MotionConfig>
  )
}

export function useMotionPolicy(): EffectiveMotionPolicy {
  const context = useContext(MotionContext)
  if (!context) {
    throw new Error('useMotionPolicy must be used inside LernioMotionProvider')
  }
  return context.policy
}

export function useThemeMotion(): ThemeMotionSignature {
  const context = useContext(MotionContext)
  if (!context) {
    throw new Error('useThemeMotion must be used inside LernioMotionProvider')
  }
  return context.signature
}

export function useCanAnimate(category: MotionCategory): boolean {
  const context = useContext(MotionContext)
  if (!context) {
    throw new Error('useCanAnimate must be used inside LernioMotionProvider')
  }
  return context.canAnimate(category)
}

export function useMotionContext(): MotionContextValue {
  const context = useContext(MotionContext)
  if (!context) {
    throw new Error('useMotionContext must be used inside LernioMotionProvider')
  }
  return context
}
