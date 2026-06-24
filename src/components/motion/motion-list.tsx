'use client'

import { motion } from 'framer-motion'
import { useMotionContext } from './motion-provider'
import type { ReactNode } from 'react'

export function MotionList({ children, className }: { children: ReactNode; className?: string }) {
  const { policy, signature } = useMotionContext()
  if (policy.level !== 'full') return <div className={className}>{children}</div>

  return (
    <motion.div
      className={className}
      initial="hidden"
      animate="show"
      variants={{
        hidden: {},
        show: { transition: { staggerChildren: 0.035 * policy.durationScale } },
      }}
      style={{
        '--motion-list-distance': `${signature.sectionEnter.distance}px`,
      } as React.CSSProperties}
    >
      {children}
    </motion.div>
  )
}
