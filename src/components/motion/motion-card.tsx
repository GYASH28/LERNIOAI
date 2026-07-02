'use client'

import { motion } from 'framer-motion'
import { useMotionContext } from './motion-provider'
import { Card } from '@/components/ui/card'
import type { ComponentProps } from 'react'

export function MotionCard(props: ComponentProps<typeof Card>) {
  const { policy, signature } = useMotionContext()
  if (policy.level !== 'full' || policy.strictExam) {
    return <Card {...props} />
  }

  const recipe = signature.cardHover
  return (
    <motion.div
      whileHover={{
        y: recipe.y ?? -recipe.distance,
        scale: recipe.scale ?? 1,
      }}
      transition={{ duration: recipe.duration * policy.durationScale }}
    >
      <Card {...props} />
    </motion.div>
  )
}
