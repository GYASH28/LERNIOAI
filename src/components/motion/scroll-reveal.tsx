'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Scroll-triggered reveal using IntersectionObserver.
 * GPU-accelerated, zero layout thrashing, respects reduced-motion.
 *
 * Usage:
 * const ref = useScrollReveal<HTMLDivElement>()
 * return <div ref={ref} className="scroll-reveal">...</div>
 */
export function useScrollReveal<T extends HTMLElement = HTMLDivElement>(
  options?: { threshold?: number; rootMargin?: string; once?: boolean }
) {
  const ref = useRef<T>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    // Respect reduced motion
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setRevealed(true)
            if (options?.once !== false) {
              observer.unobserve(entry.target)
            }
          } else if (options?.once === false) {
            setRevealed(false)
          }
        })
      },
      {
        threshold: options?.threshold ?? 0.1,
        rootMargin: options?.rootMargin ?? '0px 0px -50px 0px',
      }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [options?.threshold, options?.rootMargin, options?.once])

  // Attach ref + toggle class
  useEffect(() => {
    if (ref.current) {
      ref.current.classList.toggle('revealed', revealed)
    }
  }, [revealed])

  return ref
}

/**
 * Stagger reveal for grid items.
 * Returns a ref and delay (in ms) for each item.
 */
export function useStaggerReveal(itemCount: number, staggerMs = 50) {
  const ref = useRef<HTMLDivElement>(null)
  const [visibleCount, setVisibleCount] = useState(0)

  useEffect(() => {
    const el = ref.current
    if (!el) return

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setVisibleCount(itemCount)
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          // Reveal items one by one
          for (let i = 0; i < itemCount; i++) {
            setTimeout(() => setVisibleCount(i + 1), i * staggerMs)
          }
          observer.unobserve(el)
        }
      },
      { threshold: 0.1 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [itemCount, staggerMs])

  return { ref, visibleCount }
}
