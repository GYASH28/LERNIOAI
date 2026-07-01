'use client'

import { useMotionPolicy } from './motion-provider'

export function MotionProgressBar({ value }: { value: number }) {
  const policy = useMotionPolicy()
  return (
    <div className="h-2 rounded-full bg-muted overflow-hidden">
      <div
        className="h-full rounded-full bg-primary"
        style={{
          width: `${Math.max(0, Math.min(100, value))}%`,
          transition: policy.level === 'full' ? 'width 420ms cubic-bezier(0.16, 1, 0.3, 1)' : 'none',
        }}
      />
    </div>
  )
}
