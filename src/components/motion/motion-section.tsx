'use client'

import { motion } from 'framer-motion'
import { useMotionContext } from './motion-provider'
import type { ReactNode } from 'react'

export function MotionSection({ children, className }: { children: ReactNode; className?: string }) {
  const { policy, signature } = useMotionContext()
  if (policy.level !== 'full' || policy.strictExam) {
    return <section className={className}>{children}</section>
  }

  const recipe = signature.sectionEnter
  return (
    <motion.section
      className={className}
      initial={{ opacity: 0, y: recipe.y ?? recipe.distance, scale: recipe.scale ?? 1 }}
      whileInView={{ opacity: 1, y: 0, scale: 1 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ duration: recipe.duration * policy.durationScale }}
    >
      {children}
    </motion.section>
  )
}
