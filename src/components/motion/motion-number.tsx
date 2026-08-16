'use client'

import { useEffect, useRef, useState } from 'react'
import { useMotionPolicy } from './motion-provider'

export function MotionNumber({ value }: { value: number }) {
  const policy = useMotionPolicy()
  const previous = useRef(value)
  const [display, setDisplay] = useState(value)

  useEffect(() => {
    if (policy.level !== 'full') {
      previous.current = value
      return
    }

    const from = previous.current
    const diff = value - from
    const started = performance.now()
    const duration = 420 * policy.durationScale
    let frame = 0

    const tick = (now: number) => {
      const t = Math.min(1, (now - started) / duration)
      setDisplay(Math.round(from + diff * t))
      if (t < 1) frame = requestAnimationFrame(tick)
    }

    frame = requestAnimationFrame(tick)
    previous.current = value
    return () => cancelAnimationFrame(frame)
  }, [value, policy.durationScale, policy.level])

  return <span className="tabular-nums">{policy.level === 'full' ? display : value}</span>
}
