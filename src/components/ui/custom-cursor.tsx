'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'

/**
 * Custom 3D cursor — app-specific animations per page.
 * 
 * No trail. No flashy effects. Subtle, elegant, purpose-built.
 * 
 * 3D arrow shape with:
 * - CSS 3D transform for depth
 * - Gradient fill for material feel
 * - Subtle shadow beneath
 * - Page-specific idle animations
 * - Element-specific hover states
 * - Click = gentle press (no ripple)
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

// Per-page accent colors for cursor hover glow
const PAGE_ACCENTS: Record<PageTheme, string> = {
  learn: '6, 182, 212',      // cyan — knowledge
  practice: '139, 92, 246',  // violet — practice
  exams: '245, 158, 11',     // amber — focus
  coding: '16, 185, 129',    // green — code
  labs: '236, 72, 153',      // pink — experiment
  tutor: '6, 182, 212',      // cyan — AI
  dashboard: '6, 182, 212',  // cyan — home
  default: '6, 182, 212',    // cyan — default
}

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const shadowRef = useRef<HTMLDivElement>(null)
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [hidden, setHidden] = useState(false)
  const [hoverType, setHoverType] = useState<'link' | 'button' | 'input' | 'text' | null>(null)
  const pathname = usePathname()
  const pageTheme = getPageTheme(pathname)
  const accentColor = PAGE_ACCENTS[pageTheme]
  const [isDark, setIsDark] = useState(false)

  useEffect(() => {
    setIsDark(document.documentElement.classList.contains('dark'))
  }, [pathname])

  useEffect(() => {
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setHidden(true)
      return
    }

    const cursor = cursorRef.current
    const shadow = shadowRef.current
    if (!cursor || !shadow) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let cursorX = mouseX
    let cursorY = mouseY
    let shadowX = mouseX
    let shadowY = mouseY
    let idleTime = 0
    let lastMoveTime = Date.now()

    let animationId: number

    function animate() {
      // Cursor follows fast (0.35 lerp — quick but smooth)
      cursorX += (mouseX - cursorX) * 0.35
      cursorY += (mouseY - cursorY) * 0.35

      // Shadow follows slower (0.15 lerp — trailing shadow for 3D depth)
      shadowX += (mouseX - shadowX) * 0.15
      shadowY += (mouseY - shadowY) * 0.15

      // Idle detection
      const now = Date.now()
      if (now - lastMoveTime > 2000) {
        idleTime += 0.02
      } else {
        idleTime = 0
      }

      // Page-specific idle animation
      const idleOffset = Math.sin(idleTime) * 2

      if (cursor) {
        cursor.style.transform = `translate3d(${cursorX}px, ${cursorY + idleOffset}px, 0)`
      }
      if (shadow) {
        shadow.style.transform = `translate3d(${shadowX + 3}px, ${shadowY + 5 + idleOffset}px, 0)`
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY
      lastMoveTime = Date.now()

      const target = e.target as HTMLElement

      // Detect what type of element we're hovering
      if (target.closest('button, [role="button"], a[class*="bg-primary"]')) {
        setHoverType('button')
        setHovering(true)
      } else if (target.closest('a, [class*="cursor-pointer"]')) {
        setHoverType('link')
        setHovering(true)
      } else if (target.closest('input, textarea, select, [contenteditable]')) {
        setHoverType('input')
        setHovering(true)
      } else if (target.tagName === 'LABEL' || target.closest('label')) {
        setHoverType('text')
        setHovering(false)
      } else {
        setHoverType(null)
        setHovering(false)
      }
    }

    const handleMouseDown = () => setClicking(true)
    const handleMouseUp = () => setClicking(false)
    const handleMouseLeave = () => setHidden(true)
    const handleMouseEnter = () => setHidden(false)

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)

    return () => {
      cancelAnimationFrame(animationId)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
    }
  }, [])

  if (hidden) return null

  // Cursor visual states
  const scale = clicking ? 0.85 : hovering ? 1.25 : 1
  const rotation = hoverType === 'input' ? '0deg' : clicking ? '-5deg' : hovering ? '5deg' : '0deg'

  // 3D arrow colors — based on page theme
  const arrowFill = hovering
    ? `rgba(${accentColor}, 1)`
    : isDark ? '#f8fafc' : '#1a1a2e'
  const arrowHighlight = hovering
    ? `rgba(${accentColor}, 0.5)`
    : isDark ? 'rgba(255,255,255,0.4)' : 'rgba(255,255,255,0.15)'
  const arrowShadow = hovering
    ? `rgba(${accentColor}, 0.3)`
    : 'rgba(0,0,0,0.15)'

  return (
    <>
      {/* 3D shadow (beneath cursor, offset for depth) */}
      <div
        ref={shadowRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ zIndex: 9998, willChange: 'transform' }}
        aria-hidden="true"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" style={{ transform: 'translate(-2px, -2px)' }}>
          <path
            d="M5 3 L5 19 L10 14 L13 21 L16 19.5 L13 13 L20 13 Z"
            fill={arrowShadow}
            style={{ filter: 'blur(3px)' }}
          />
        </svg>
      </div>

      {/* Main 3D cursor */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none"
        style={{ zIndex: 9999, willChange: 'transform' }}
        aria-hidden="true"
      >
        <div
          style={{
            transform: `scale(${scale}) rotate(${rotation})`,
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            transformStyle: 'preserve-3d',
            perspective: '200px',
          }}
        >
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            style={{
              filter: hovering
                ? `drop-shadow(0 0 6px rgba(${accentColor}, 0.5)) drop-shadow(0 2px 4px rgba(0,0,0,0.2))`
                : 'drop-shadow(0 2px 3px rgba(0,0,0,0.25))',
              transition: 'filter 0.2s ease',
            }}
          >
            <defs>
              {/* 3D gradient — gives material depth */}
              <linearGradient id="cursor-3d-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor={arrowFill} />
                <stop offset="50%" stopColor={arrowFill} />
                <stop offset="100%" stopColor={arrowHighlight} />
              </linearGradient>
              {/* Edge highlight for 3D effect */}
              <linearGradient id="cursor-edge" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="rgba(255,255,255,0.3)" />
                <stop offset="100%" stopColor="rgba(255,255,255,0)" />
              </linearGradient>
            </defs>

            {/* Main arrow body with 3D gradient */}
            <path
              d="M5 3 L5 19 L10 14 L13 21 L16 19.5 L13 13 L20 13 Z"
              fill="url(#cursor-3d-gradient)"
              stroke={hovering ? `rgba(${accentColor}, 0.8)` : 'rgba(255,255,255,0.1)'}
              strokeWidth="0.5"
              strokeLinejoin="round"
              style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
            />

            {/* Top edge highlight — 3D light reflection */}
            <path
              d="M5 3 L5 19 L10 14 L13 21 L16 19.5 L13 13 L20 13 Z"
              fill="url(#cursor-edge)"
              opacity="0.3"
              strokeLinejoin="round"
            />

            {/* Inner shine line — gives glass/metal feel */}
            <line
              x1="6" y1="5" x2="6" y2="17"
              stroke="rgba(255,255,255,0.15)"
              strokeWidth="1"
              strokeLinecap="round"
            />
          </svg>
        </div>
      </div>

      <style>{`
        /* Hide default cursor on desktop only */
        @media (hover: hover) and (pointer: fine) {
          * {
            cursor: none !important;
          }
        }

        /* Keep default cursor on touch devices */
        @media (hover: none) and (pointer: coarse) {
          * {
            cursor: auto !important;
          }
        }
      `}</style>
    </>
  )
}
