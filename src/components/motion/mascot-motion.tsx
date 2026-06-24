'use client'

import { motion } from 'framer-motion'
import { useMotionContext } from './motion-provider'
import type { ReactNode } from 'react'

export function MascotMotion({ children, state }: { children: ReactNode; state: string }) {
  const { policy, signature } = useMotionContext()
  if (!policy.mascotAnimationEnabled) return <>{children}</>

  const recipe = state === 'thinking' ? signature.mascotIdle.thinking : signature.mascotIdle.idle

  return (
    <motion.span
      className="inline-flex"
      animate={{
        y: recipe.y ?? 0,
        x: recipe.x ?? 0,
        rotate: recipe.rotate ?? 0,
        scale: recipe.scale ?? 1,
      }}
      transition={{
        duration: recipe.duration * policy.durationScale,
        repeat: Infinity,
        repeatType: 'mirror',
      }}
    >
      {children}
    </motion.span>
  )
}
