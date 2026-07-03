'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Custom 3D cursor — bulletproof version.
 * Uses direct left/top positioning (no transforms) to avoid
 * z-index and stacking context conflicts.
 */

type PageTheme = 'learn' | 'practice' | 'exams' | 'coding' | 'labs' | 'tutor' | 'dashboard' | 'default'

function getPageTheme(pathname: string): PageTheme {
  if (pathname.startsWith('/learn')) return 'learn'
  if (pathname.startsWith('/practice')) return 'practice'
  if (pathname.startsWith('/exams')) return 'exams'
  if (pathname.startsWith('/coding')) return 'coding'
  if (pathname.startsWith('/labs')) return 'labs'
  if (pathname.startsWith('/tutor')) return 'tutor'
  if (pathname.startsWith('/dashboard')) return 'dashboard'
  return 'default'
}

const PAGE_ACCENTS: Record<PageTheme, string> = {
  learn: '6, 182, 212',
  practice: '139, 92, 246',
  exams: '245, 158, 11',
  coding: '16, 185, 129',
  labs: '236, 72, 153',
  tutor: '6, 182, 212',
  dashboard: '6, 182, 212',
  default: '6, 182, 212',
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [hidden, setHidden] = useState(true) // Start hidden until mouse moves
  const [isDark, setIsDark] = useState(false)
  const pathname = usePathname()
  const pageTheme = getPageTheme(pathname)
  const accentColor = PAGE_ACCENTS[pageTheme]

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))

    // Don't show on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      return
    }

    const cursor = cursorRef.current
    if (!cursor) return

    // Direct position update — no transforms, no lerp, no lag
    const handleMouseMove = (e: MouseEvent) => {
      setHidden(false)
      if (cursor) {
        cursor.style.left = e.clientX + 'px'
        cursor.style.top = e.clientY + 'px'
      }

      // Detect hover target
      const target = e.target as HTMLElement
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"], label, [class*="cursor-pointer"]')
      setHovering(Boolean(isInteractive))
    }

    const handleMouseDown = () => setClicking(true)
    const handleMouseUp = () => setClicking(false)
    const handleMouseLeave = () => setHidden(true)
    const handleMouseEnter = () => setHidden(false)

    document.addEventListener('mousemove', handleMouseMove, { passive: true })
    document.addEventListener('mousedown', handleMouseDown, { passive: true })
    document.addEventListener('mouseup', handleMouseUp, { passive: true })
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [])

  // Don't render on touch devices
  if (typeof window !== 'undefined' && ('ontouchstart' in window || navigator.maxTouchPoints > 0)) {
    return null
  }

  const scale = clicking ? 0.85 : hovering ? 1.2 : 1

  const arrowFill = hovering
    ? `rgba(${accentColor}, 1)`
    : isDark ? '#f8fafc' : '#1a1a2e'
  const arrowHighlight = hovering
    ? `rgba(${accentColor}, 0.5)`
    : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'

  return (
    <>
      <div
        ref={cursorRef}
        className="fixed pointer-events-none"
        style={{
          // Maximum z-index — nothing can cover this
          zIndex: 2147483647,
          // Offset so the arrow tip is at the click point
          marginLeft: '-4px',
          marginTop: '-2px',
          // Smooth scale transition
          transition: 'opacity 0.15s ease',
          opacity: hidden ? 0 : 1,
          willChange: 'left, top',
        }}
        aria-hidden="true"
      >
        <div
          style={{
            transform: `scale(${scale})`,
            transition: 'transform 0.12s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: hovering
              ? `drop-shadow(0 0 6px rgba(${accentColor}, 0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))`
              : 'drop-shadow(0 2px 3px rgba(0,0,0,0.3))',
            transitionFilter: 'filter 0.2s ease',
          }}
        >
          <svg width="22" height="22" viewBox="0 0 24 24">
            <defs>
              <linearGradient id="cursor-3d-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={arrowFill} />
                <stop offset="60%" stopColor={arrowFill} />
                <stop offset="100%" stopColor={arrowHighlight} />
              </linearGradient>
              <linearGradient id="cursor-edge-grad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Main arrow body */}
            <path
              d="M5 3 L5 19 L10 14 L13 21 L16 19.5 L13 13 L20 13 Z"
              fill="url(#cursor-3d-grad)"
              stroke={hovering ? `rgba(${accentColor}, 0.8)` : 'rgba(255,255,255,0.1)'}
              strokeWidth="0.5"
              strokeLinejoin="round"
              style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
            />

            {/* Edge highlight for 3D effect */}
            <path
              d="M5 3 L5 19 L10 14 L13 21 L16 19.5 L13 13 L20 13 Z"
              fill="url(#cursor-edge-grad)"
              opacity="0.3"
              strokeLinejoin="round"
            />

            {/* Inner shine */}
            <line x1="6" y1="5" x2="6" y2="17" stroke="rgba(255,255,255,0.15)" strokeWidth="1" strokeLinecap="round" />
          </svg>
        </div>
      </div>

      <style>{`
        @media (hover: hover) and (pointer: fine) {
          body, div, span, a, button, p, h1, h2, h3, h4, h5, h6,
          section, nav, header, footer, main, aside, article, ul, li,
          table, thead, tbody, tr, td, th, label, img, svg, canvas {
            cursor: none !important;
          }
          input, textarea, select, [contenteditable] {
            cursor: text !important;
          }
        }
        @media (hover: none) and (pointer: coarse) {
          * { cursor: auto !important; }
        }
      `}</style>
    </>
  )
}
