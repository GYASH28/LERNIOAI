'use client'

import { useMemo } from 'react'
import { useMotionContext } from './motion-provider'

export function CelebrationLayer({ active }: { active: boolean }) {
  const { policy, signature } = useMotionContext()
  const particles = useMemo(
    () => Array.from({ length: signature.celebration.particles }, (_, index) => index),
    [signature.celebration.particles],
  )

  if (!active || !policy.celebrationsEnabled) return null

  return (
    <div
      aria-hidden="true"
      className="celebration-layer"
      data-celebration={signature.celebration.kind}
      style={{ '--celebration-duration': `${signature.celebration.duration}s` } as React.CSSProperties}
    >
      {particles.map((particle) => (
        <span key={particle} className="celebration-layer__particle" data-index={particle} />
      ))}
    </div>
  )
}
