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

  const enter = signature.pageEnter
  const exit = signature.pageExit

  return (
    <motion.div
      data-testid="motion-page"
      data-view={viewKey}
      data-motion={policy.level}
      initial={{
        opacity: 0,
        x: enter.x ?? 0,
        y: enter.y ?? enter.distance,
        scale: enter.scale ?? 1,
      }}
      animate={{ opacity: 1, x: 0, y: 0, scale: 1 }}
      exit={{
        opacity: 0,
        x: exit.x ?? 0,
        y: exit.y ?? -exit.distance,
      }}
      transition={{
        duration: enter.duration * policy.durationScale,
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
