'use client'

import { useEffect, useState } from 'react'

function shouldUseEnhancedIntro() {
  if (typeof window === 'undefined') return false
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false
  if (document.documentElement.dataset.motion !== 'full') return false
  if (document.documentElement.dataset.lowPower === 'true') return false

  const navigatorWithHints = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string }
    deviceMemory?: number
  }
  if (navigatorWithHints.connection?.saveData) return false
  if (navigatorWithHints.connection?.effectiveType?.includes('2g')) return false
  if (navigatorWithHints.deviceMemory && navigatorWithHints.deviceMemory < 4) return false
  return true
}

export function Hero3DLoader() {
  const [active, setActive] = useState(false)

  useEffect(() => {
    if (!shouldUseEnhancedIntro()) return

    let cancelled = false
    const host = document.querySelector('.knowledge-core-shell')
    if (!host) return

    const enable = () => {
      if (!cancelled) setActive(true)
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry?.isIntersecting) return
        window.setTimeout(enable, 480)
        observer.disconnect()
      },
      { rootMargin: '120px' },
    )
    observer.observe(host)

    return () => {
      cancelled = true
      observer.disconnect()
    }
  }, [])

  if (!active) return null

  return (
    <div className="knowledge-core-enhancement" aria-hidden="true">
      <span className="knowledge-core-trace knowledge-core-trace--a" />
      <span className="knowledge-core-trace knowledge-core-trace--b" />
      <span className="knowledge-core-trace knowledge-core-trace--c" />
      <span className="knowledge-core-spark knowledge-core-spark--a" />
      <span className="knowledge-core-spark knowledge-core-spark--b" />
      <span className="knowledge-core-spark knowledge-core-spark--c" />
    </div>
  )
}
