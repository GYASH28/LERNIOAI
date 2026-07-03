'use client'

import { useEffect, useRef, useState } from 'react'

/**
 * Custom animated cursor — replaces the default OS cursor.
 * 
 * Features:
 * - Triangular arrow shape (filled, with glow)
 * - Smooth follow with slight lag (premium feel)
 * - Scales up on hover over interactive elements (links, buttons)
 * - Ripple effect on click
 * - Color shifts on hover (brand color)
 * - Trail effect (subtle particles following cursor)
 */

export function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null)
  const trailRef = useRef<HTMLCanvasElement>(null)
  const [hovering, setHovering] = useState(false)
  const [clicking, setClicking] = useState(false)
  const [ripples, setRipples] = useState<{ x: number; y: number; id: number }[]>([])
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    // Don't show custom cursor on touch devices
    if ('ontouchstart' in window || navigator.maxTouchPoints > 0) {
      setHidden(true)
      return
    }

    const cursor = cursorRef.current
    const trail = trailRef.current
    if (!cursor || !trail) return

    const ctx = trail.getContext('2d')
    if (!ctx) return

    let mouseX = window.innerWidth / 2
    let mouseY = window.innerHeight / 2
    let cursorX = mouseX
    let cursorY = mouseY
    let trailX = mouseX
    let trailY = mouseY

    // Trail particles
    interface TrailParticle {
      x: number
      y: number
      life: number
      maxLife: number
    }
    const trailParticles: TrailParticle[] = []

    let animationId: number

    function animate() {
      // Smooth cursor follow (lerp)
      cursorX += (mouseX - cursorX) * 0.25
      cursorY += (mouseY - cursorY) * 0.25

      // Trail follows slower
      trailX += (mouseX - trailX) * 0.12
      trailY += (mouseY - trailY) * 0.12

      if (cursor) {
        cursor.style.transform = `translate(${cursorX}px, ${cursorY}px)`
      }

      // Draw trail on canvas
      if (ctx && trail) {
        ctx.clearRect(0, 0, trail.width, trail.height)

        // Add trail particle
        if (Math.abs(mouseX - trailX) > 1 || Math.abs(mouseY - trailY) > 1) {
          trailParticles.push({
            x: trailX,
            y: trailY,
            life: 1,
            maxLife: 30,
          })
        }

        // Update and draw trail particles
        for (let i = trailParticles.length - 1; i >= 0; i--) {
          const p = trailParticles[i]
          p.life -= 1 / p.maxLife
          if (p.life <= 0) {
            trailParticles.splice(i, 1)
            continue
          }

          const radius = 4 * p.life
          const alpha = 0.3 * p.life

          // Glow
          const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, radius * 3)
          gradient.addColorStop(0, `rgba(6, 182, 212, ${alpha})`)
          gradient.addColorStop(1, 'rgba(6, 182, 212, 0)')
          ctx.fillStyle = gradient
          ctx.beginPath()
          ctx.arc(p.x, p.y, radius * 3, 0, Math.PI * 2)
          ctx.fill()
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Mouse move
    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX
      mouseY = e.clientY

      // Check if hovering over interactive element
      const target = e.target as HTMLElement
      const isInteractive = target.closest('a, button, input, textarea, select, [role="button"], [class*="cursor-pointer"], label')
      setHovering(Boolean(isInteractive))
    }

    // Mouse down — create ripple
    const handleMouseDown = (e: MouseEvent) => {
      setClicking(true)
      const id = Date.now()
      setRipples(prev => [...prev, { x: e.clientX, y: e.clientY, id }])
      setTimeout(() => {
        setRipples(prev => prev.filter(r => r.id !== id))
      }, 800)
    }

    const handleMouseUp = () => {
      setClicking(false)
    }

    // Mouse leave/enter
    const handleMouseLeave = () => setHidden(true)
    const handleMouseEnter = () => setHidden(false)

    // Resize canvas
    const handleResize = () => {
      if (trail) {
        trail.width = window.innerWidth
        trail.height = window.innerHeight
      }
    }

    handleResize()

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mousedown', handleMouseDown)
    document.addEventListener('mouseup', handleMouseUp)
    document.addEventListener('mouseleave', handleMouseLeave)
    document.addEventListener('mouseenter', handleMouseEnter)
    window.addEventListener('resize', handleResize)

    return () => {
      cancelAnimationFrame(animationId)
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mousedown', handleMouseDown)
      document.removeEventListener('mouseup', handleMouseUp)
      document.removeEventListener('mouseleave', handleMouseLeave)
      document.removeEventListener('mouseenter', handleMouseEnter)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  if (hidden) return null

  return (
    <>
      {/* Trail canvas */}
      <canvas
        ref={trailRef}
        className="fixed inset-0 pointer-events-none"
        style={{ zIndex: 9998 }}
        aria-hidden="true"
      />

      {/* Custom cursor — triangular arrow */}
      <div
        ref={cursorRef}
        className="fixed top-0 left-0 pointer-events-none transition-transform duration-100"
        style={{ zIndex: 9999, willChange: 'transform' }}
        aria-hidden="true"
      >
        {/* The arrow shape */}
        <svg
          width="28"
          height="28"
          viewBox="0 0 28 28"
          style={{
            transform: `translate(-4px, -4px) scale(${clicking ? 0.8 : hovering ? 1.4 : 1})`,
            transition: 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
            filter: hovering
              ? 'drop-shadow(0 0 8px rgba(6, 182, 212, 0.6)) drop-shadow(0 0 16px rgba(6, 182, 212, 0.3))'
              : 'drop-shadow(0 2px 4px rgba(0, 0, 0, 0.3))',
          }}
        >
          {/* Arrow/triangle shape */}
          <path
            d="M4 2 L4 22 L10 16 L14 24 L18 22 L14 14 L22 14 Z"
            fill={hovering ? '#06B6D4' : '#1a1a2e'}
            stroke={hovering ? '#06B6D4' : 'rgba(255,255,255,0.3)'}
            strokeWidth="1"
            strokeLinejoin="round"
            style={{ transition: 'fill 0.2s ease, stroke 0.2s ease' }}
          />
          {/* Inner glow when hovering */}
          {hovering && (
            <path
              d="M4 2 L4 22 L10 16 L14 24 L18 22 L14 14 L22 14 Z"
              fill="none"
              stroke="rgba(6, 182, 212, 0.4)"
              strokeWidth="3"
              strokeLinejoin="round"
              style={{
                filter: 'blur(4px)',
              }}
            />
          )}
        </svg>
      </div>

      {/* Click ripples */}
      {ripples.map(ripple => (
        <div
          key={ripple.id}
          className="fixed pointer-events-none"
          style={{
            left: ripple.x,
            top: ripple.y,
            zIndex: 9997,
            transform: 'translate(-50%, -50%)',
          }}
        >
          <div
            style={{
              width: '10px',
              height: '10px',
              borderRadius: '50%',
              border: '2px solid rgba(6, 182, 212, 0.6)',
              animation: 'cursor-ripple 0.8s ease-out forwards',
            }}
          />
        </div>
      ))}

      <style>{`
        @keyframes cursor-ripple {
          0% {
            width: 10px;
            height: 10px;
            opacity: 1;
            border-width: 3px;
          }
          100% {
            width: 80px;
            height: 80px;
            opacity: 0;
            border-width: 1px;
          }
        }

        /* Hide default cursor on desktop */
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
