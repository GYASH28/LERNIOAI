'use client'

import { useMotionContext } from './motion-provider'
import type { EffectiveMotionPolicy, ThemeMotionSignature } from '@/lib/motion/types'
import type { Palette } from '@/lib/theme-types'

interface ThemeAtmosphereViewProps {
  palette: Palette
  policy: EffectiveMotionPolicy
  signature: ThemeMotionSignature
}

export function ThemeAtmosphereView({
  palette,
  policy,
  signature,
}: ThemeAtmosphereViewProps) {
  if (!policy.ambientEnabled) return null

  return (
    <div
      aria-hidden="true"
      className="theme-atmosphere"
      data-palette={palette}
      data-atmosphere={signature.atmosphere.kind}
      data-motion-mode="animated"
      data-testid="theme-atmosphere"
      style={{
        '--motion-ambient-opacity': signature.atmosphere.opacity,
        '--motion-ambient-speed': `${signature.atmosphere.speedSeconds}s`,
      } as React.CSSProperties}
    >
      {Array.from({ length: signature.atmosphere.maxNodes }).map((_, index) => (
        <span
          key={index}
          className="theme-atmosphere__node"
          data-index={index}
          data-testid="atmosphere-node"
        />
      ))}
    </div>
  )
}

export function ThemeAtmosphere() {
  const { palette, policy, signature } = useMotionContext()
  return <ThemeAtmosphereView palette={palette} policy={policy} signature={signature} />
}
