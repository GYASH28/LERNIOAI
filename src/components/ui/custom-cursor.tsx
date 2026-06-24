'use client'

import { useEffect, useState, useRef } from 'react'
import { useMotionPolicy } from '@/components/motion/motion-provider'

type CursorState = 'idle' | 'hovering' | 'loading' | 'clock' | 'progress' | 'hourglass'

interface Ripple {
  id: number
  x: number
  y: number
}

export function CustomCursor() {
  const [mounted, setMounted] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [cursorState, setCursorState] = useState<CursorState>('idle')
  const [ripples, setRipples] = useState<Ripple[]>([])
  const [isTextInput, setIsTextInput] = useState(false)
  const [isVisible, setIsVisible] = useState(false)

  const cursorRef = useRef<HTMLDivElement>(null)
  const policy = useMotionPolicy()
  const isReducedMotion = policy.level !== 'full'

  // 1. Device check: Only enable on desktop pointer devices
  useEffect(() => {
    setMounted(true)
    const mediaQuery = window.matchMedia('(pointer: fine)')
    setEnabled(mediaQuery.matches)

    const handleChange = (e: MediaQueryListEvent) => {
      setEnabled(e.matches)
    }
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [])

  // 2. Event listeners for tracking, hovering, clicking
  useEffect(() => {
    if (!enabled) return

    const cursor = cursorRef.current

    // Move handler - direct DOM update to bypass React re-renders on mousemove
    const handlePointerMove = (e: PointerEvent) => {
      if (!isVisible) setIsVisible(true)

      if (cursor) {
        // Offset slightly to align the top-left arrow tip (2,2) with the exact hotspot
        const x = e.clientX - 2
        const y = e.clientY - 2
        cursor.style.transform = `translate3d(${x}px, ${y}px, 0)`
      }

      // Check what we are hovering
      const target = e.target as HTMLElement | null
      if (!target) return

      // Text Input checking: hide custom cursor and show standard I-beam
      const isInput =
        target.tagName === 'INPUT' ||
        target.tagName === 'TEXTAREA' ||
        target.isContentEditable ||
        target.closest('input') !== null ||
        target.closest('textarea') !== null

      setIsTextInput(isInput)

      // Hover clickable elements
      const isClickable =
        target.closest('a') !== null ||
        target.closest('button') !== null ||
        target.closest('[role="button"]') !== null ||
        target.closest('[role="link"]') !== null ||
        target.classList.contains('cursor-pointer') ||
        window.getComputedStyle(target).cursor === 'pointer'

      // Check data-cursor attributes for custom modes
      const cursorAttrElement = target.closest('[data-cursor]')
      const customCursorType = cursorAttrElement?.getAttribute('data-cursor') as CursorState | null

      if (customCursorType) {
        setCursorState(customCursorType)
      } else if (isClickable) {
        setCursorState('hovering')
      } else {
        setCursorState('idle')
      }
    }

    // Trigger click ripple
    const handlePointerDown = (e: PointerEvent) => {
      if (isTextInput) return
      
      const newRipple = {
        id: Date.now() + Math.random(),
        x: e.clientX,
        y: e.clientY,
      }
      setRipples((prev) => [...prev, newRipple])
    }

    // Pointer leaves window
    const handlePointerLeave = () => {
      setIsVisible(false)
    }

    const handlePointerEnter = () => {
      setIsVisible(true)
    }

    // Apply global CSS class to body when custom cursor is active
    document.documentElement.classList.add('custom-cursor-active')

    window.addEventListener('pointermove', handlePointerMove, { passive: true })
    window.addEventListener('pointerdown', handlePointerDown, { passive: true })
    document.addEventListener('pointerleave', handlePointerLeave)
    document.addEventListener('pointerenter', handlePointerEnter)

    return () => {
      document.documentElement.classList.remove('custom-cursor-active')
      window.removeEventListener('pointermove', handlePointerMove)
      window.removeEventListener('pointerdown', handlePointerDown)
      document.removeEventListener('pointerleave', handlePointerLeave)
      document.removeEventListener('pointerenter', handlePointerEnter)
    }
  }, [enabled, isTextInput, isVisible])

  // Ripple cleanup
  useEffect(() => {
    if (ripples.length > 0) {
      const timer = setTimeout(() => {
        setRipples((prev) => prev.slice(1))
      }, 800)
      return () => clearTimeout(timer)
    }
  }, [ripples])

  if (!mounted || !enabled) return null

  // If hovering text inputs, hide the custom cursor to let native I-beam take over
  const visible = isVisible && !isTextInput

  return (
    <>
      {/* 1. Custom Pointer Element */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 z-[9999] pointer-events-none transition-opacity duration-300"
        style={{
          opacity: visible ? 1 : 0,
          willChange: 'transform',
        }}
      >
        <div className="relative">
          {/* Main 3D Arrow Cursor */}
          <svg
            width="28"
            height="28"
            viewBox="0 0 28 28"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="drop-shadow-[0_2px_4px_rgba(0,0,0,0.3)]"
          >
            {/* Left Facet (Light charcoal) */}
            <path
              d="M 2 2 L 2 20 L 8.5 15 L 2 2"
              fill="url(#left-facet)"
            />
            {/* Right Facet (Darker charcoal) */}
            <path
              d="M 2 2 L 8.5 15 L 17 14 L 2 2"
              fill="url(#right-facet)"
            />
            {/* Outer border (crisp white) */}
            <path
              d="M 2 2 L 2 20 L 8.5 15 L 17 14 Z"
              stroke="#ffffff"
              strokeWidth="1.5"
              strokeLinejoin="round"
            />
            <defs>
              <linearGradient id="left-facet" x1="2" y1="2" x2="8.5" y2="15" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#3f3f46" />
                <stop offset="100%" stopColor="#18181b" />
              </linearGradient>
              <linearGradient id="right-facet" x1="2" y1="2" x2="17" y2="14" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#27272a" />
                <stop offset="100%" stopColor="#09090b" />
              </linearGradient>
            </defs>
          </svg>

          {/* 2. Loading Arc Spinner (Row 2 #1) */}
          {cursorState === 'loading' && !isReducedMotion && (
            <div className="absolute top-[-8px] left-[-8px] animate-spin">
              <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                <circle
                  cx="10"
                  cy="10"
                  r="7.5"
                  stroke="#0ea5e9"
                  strokeWidth="1.5"
                  strokeDasharray="4 3"
                  className="opacity-90"
                />
              </svg>
            </div>
          )}

          {/* 3. Clock Timer (Row 2 #2) */}
          {cursorState === 'clock' && (
            <div className="absolute top-[8px] left-[18px]">
              <svg width="18" height="18" viewBox="0 0 18 18" fill="none" className="drop-shadow-md">
                <circle cx="9" cy="9" r="7" stroke="#0ea5e9" strokeWidth="1.5" fill="#18181b" />
                {/* Rotating hands */}
                <line
                  x1="9"
                  y1="9"
                  x2="9"
                  y2="5"
                  stroke="#0ea5e9"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '9px 9px',
                    animation: isReducedMotion ? 'none' : 'spin 6s linear infinite',
                  }}
                />
                <line
                  x1="9"
                  y1="9"
                  x2="13"
                  y2="9"
                  stroke="#0ea5e9"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  style={{
                    transformOrigin: '9px 9px',
                    animation: isReducedMotion ? 'none' : 'spin 24s linear infinite',
                  }}
                />
              </svg>
            </div>
          )}

          {/* 4. Hourglass (Row 2 #3) */}
          {cursorState === 'hourglass' && (
            <div
              className="absolute top-[6px] left-[18px]"
              style={{
                animation: isReducedMotion ? 'none' : 'hourglass-flip 3s ease-in-out infinite',
              }}
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="drop-shadow-md">
                {/* Hourglass frame */}
                <path
                  d="M3 2 H13 M3 14 H13 M4 2 L8 8 L12 2 M4 14 L8 8 L12 14"
                  stroke="#0ea5e9"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                {/* Sand */}
                <polygon points="5,3 11,3 8,7" fill="#38bdf8" className="opacity-60" />
                <polygon points="6,13 10,13 8,9" fill="#38bdf8" />
              </svg>
            </div>
          )}

          {/* 5. Progress Bar (Row 2 #4) */}
          {cursorState === 'progress' && (
            <div className="absolute top-[8px] left-[18px]">
              <svg width="28" height="10" viewBox="0 0 28 10" fill="none" className="drop-shadow-md">
                <rect x="1" y="1" width="26" height="8" rx="4" stroke="#0ea5e9" strokeWidth="1" fill="#18181b" />
                <rect
                  x="3"
                  y="3"
                  width="10"
                  height="4"
                  rx="2"
                  fill="#0ea5e9"
                  style={{
                    animation: isReducedMotion ? 'none' : 'progress-fill 2.5s ease-in-out infinite',
                  }}
                />
              </svg>
            </div>
          )}

          {/* 6. Sparkles / Hover Sparkles (Row 3 #3) */}
          {cursorState === 'hovering' && !isReducedMotion && (
            <>
              {/* Sparkle 1 */}
              <div
                className="absolute"
                style={{
                  top: '-4px',
                  left: '12px',
                  animation: 'sparkle-float 1.5s ease-in-out infinite alternate',
                }}
              >
                <svg width="8" height="8" viewBox="0 0 8 8" fill="none">
                  <path d="M 0 4 Q 4 4 4 0 Q 4 4 8 4 Q 4 4 4 8 Q 4 4 0 4 Z" fill="#0ea5e9" />
                </svg>
              </div>
              {/* Sparkle 2 */}
              <div
                className="absolute"
                style={{
                  top: '12px',
                  left: '-4px',
                  animation: 'sparkle-float 1.8s ease-in-out infinite alternate-reverse',
                }}
              >
                <svg width="6" height="6" viewBox="0 0 8 8" fill="none">
                  <path d="M 0 4 Q 4 4 4 0 Q 4 4 8 4 Q 4 4 4 8 Q 4 4 0 4 Z" fill="#38bdf8" />
                </svg>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 2. Global Click Ripples (Row 3 #4 Concentric rings) */}
      {ripples.map((ripple) => (
        <div
          key={ripple.id}
          className="fixed z-[9999] pointer-events-none -translate-x-1/2 -translate-y-1/2"
          style={{
            left: ripple.x,
            top: ripple.y,
          }}
        >
          <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
            {/* Inner Ring */}
            <circle cx="24" cy="24" r="2" fill="none" strokeWidth="1.5">
              <animate
                attributeName="r"
                values="2;22"
                dur="0.6s"
                repeatCount="1"
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="1;0"
                dur="0.6s"
                repeatCount="1"
                fill="freeze"
              />
              <animate
                attributeName="stroke"
                values="#0ea5e9;#0891b2"
                dur="0.6s"
                repeatCount="1"
                fill="freeze"
              />
            </circle>
            {/* Outer Ring */}
            <circle cx="24" cy="24" r="2" fill="none" strokeWidth="1">
              <animate
                attributeName="r"
                values="2;15"
                dur="0.5s"
                begin="0.1s"
                repeatCount="1"
                fill="freeze"
              />
              <animate
                attributeName="opacity"
                values="1;0"
                dur="0.5s"
                begin="0.1s"
                repeatCount="1"
                fill="freeze"
              />
              <animate
                attributeName="stroke"
                values="#38bdf8;#0ea5e9"
                dur="0.5s"
                begin="0.1s"
                repeatCount="1"
                fill="freeze"
              />
            </circle>
          </svg>
        </div>
      ))}

      {/* 3. Helper CSS animations */}
      <style jsx global>{`
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }

        @keyframes hourglass-flip {
          0%,
          85% {
            transform: rotate(0deg);
          }
          95%,
          100% {
            transform: rotate(180deg);
          }
        }

        @keyframes progress-fill {
          0% {
            width: 3px;
          }
          50% {
            width: 22px;
          }
          100% {
            width: 3px;
          }
        }

        @keyframes sparkle-float {
          0% {
            transform: translateY(0px) scale(0.7);
            opacity: 0.5;
          }
          100% {
            transform: translateY(-4px) scale(1.1) rotate(15deg);
            opacity: 1;
          }
        }
      `}</style>
    </>
  )
}
