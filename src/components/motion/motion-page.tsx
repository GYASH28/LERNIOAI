'use client'

import { motion } from 'framer-motion'
import { useMotionContext } from './motion-provider'
import type { EffectiveMotionPolicy, ThemeMotionSignature } from '@/lib/motion/types'
import type { ReactNode } from 'react'

interface MotionPageViewProps {
  viewKey: string
  policy: EffectiveMotionPolicy
  signature: ThemeMotionSignature
  children: ReactNode
}

export function MotionPageView({
  viewKey,
  policy,
  signature,
  children,
}: MotionPageViewProps) {
  const canNavigate = policy.level === 'full' && !policy.strictExam && policy.tabVisible
  if (!canNavigate) {
    return (
      <div data-testid="motion-page" data-view={viewKey} data-motion={policy.level}>
        {children}
      </div>
    )
  }

  const exit = signature.pageExit

  return (
    <motion.div
      data-testid="motion-page"
      data-view={viewKey}
      data-motion={policy.level}
      /* Do not fade initial content: it temporarily lowers text contrast,
         including loading announcements, below WCAG thresholds. */
      initial={false}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: exit.x ?? 0,
        y: exit.y ?? -exit.distance,
      }}
      transition={{
        duration: signature.pageEnter.duration * policy.durationScale,
      }}
    >
      {children}
    </motion.div>
  )
}

export function MotionPage({ viewKey, children }: { viewKey: string; children: ReactNode }) {
  const { policy, signature } = useMotionContext()
  return (
    <MotionPageView viewKey={viewKey} policy={policy} signature={signature}>
      {children}
    </MotionPageView>
  )
}
