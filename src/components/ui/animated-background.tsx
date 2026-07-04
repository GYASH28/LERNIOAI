'use client'

import { useEffect, useRef } from 'react'

/**
 * Calming animated background — floating particles + gradient orbs.
 * Uses canvas for smooth 60fps animation.
 */
export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    let width = window.innerWidth
    let height = window.innerHeight
    canvas.width = width
    canvas.height = height

    // Get brand color from CSS variable
    const root = getComputedStyle(document.documentElement)
    const isDark = document.documentElement.classList.contains('dark')
    const brandColor = isDark ? '6, 182, 212' : '6, 182, 212'     // cyan
    const accentColor = isDark ? '139, 92, 246' : '139, 92, 246'  // violet

    // Particles
    interface Particle {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      alpha: number
      pulse: number
    }

    const particleCount = Math.min(40, Math.floor(width / 30))
    const particles: Particle[] = []

    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 3 + 1,
        color: Math.random() > 0.5 ? brandColor : accentColor,
        alpha: Math.random() * 0.3 + 0.1,
        pulse: Math.random() * Math.PI * 2,
      })
    }

    // Large gradient orbs
    interface Orb {
      x: number
      y: number
      vx: number
      vy: number
      radius: number
      color: string
      alpha: number
    }

    const orbs: Orb[] = [
      { x: width * 0.2, y: height * 0.3, vx: 0.15, vy: 0.1, radius: 250, color: brandColor, alpha: 0.08 },
      { x: width * 0.8, y: height * 0.7, vx: -0.12, vy: -0.08, radius: 300, color: accentColor, alpha: 0.06 },
      { x: width * 0.5, y: height * 0.5, vx: 0.08, vy: -0.12, radius: 200, color: brandColor, alpha: 0.05 },
    ]

    let animationId: number

    function animate() {
      if (!ctx || !canvas) return
      ctx.clearRect(0, 0, width, height)

      // Draw orbs (large soft gradients)
      for (const orb of orbs) {
        orb.x += orb.vx
        orb.y += orb.vy

        // Bounce off edges
        if (orb.x < -orb.radius || orb.x > width + orb.radius) orb.vx *= -1
        if (orb.y < -orb.radius || orb.y > height + orb.radius) orb.vy *= -1

        const gradient = ctx.createRadialGradient(orb.x, orb.y, 0, orb.x, orb.y, orb.radius)
        gradient.addColorStop(0, `rgba(${orb.color}, ${orb.alpha})`)
        gradient.addColorStop(1, `rgba(${orb.color}, 0)`)
        ctx.fillStyle = gradient
        ctx.fillRect(orb.x - orb.radius, orb.y - orb.radius, orb.radius * 2, orb.radius * 2)
      }

      // Draw particles
      for (const p of particles) {
        p.x += p.vx
        p.y += p.vy
        p.pulse += 0.02

        // Wrap around edges
        if (p.x < 0) p.x = width
        if (p.x > width) p.x = 0
        if (p.y < 0) p.y = height
        if (p.y > height) p.y = 0

        const pulseAlpha = p.alpha + Math.sin(p.pulse) * 0.05
        const pulseRadius = p.radius + Math.sin(p.pulse) * 0.5

        ctx.beginPath()
        ctx.arc(p.x, p.y, pulseRadius, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color}, ${pulseAlpha})`
        ctx.fill()

        // Glow
        ctx.beginPath()
        ctx.arc(p.x, p.y, pulseRadius * 3, 0, Math.PI * 2)
        ctx.fillStyle = `rgba(${p.color}, ${pulseAlpha * 0.15})`
        ctx.fill()
      }

      // Draw connections between nearby particles
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x
          const dy = particles[i].y - particles[j].y
          const dist = Math.sqrt(dx * dx + dy * dy)
          if (dist < 120) {
            ctx.beginPath()
            ctx.moveTo(particles[i].x, particles[i].y)
            ctx.lineTo(particles[j].x, particles[j].y)
            ctx.strokeStyle = `rgba(${brandColor}, ${0.06 * (1 - dist / 120)})`
            ctx.lineWidth = 0.5
            ctx.stroke()
          }
        }
      }

      animationId = requestAnimationFrame(animate)
    }

    animate()

    // Resize handler
    const handleResize = () => {
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = width
      canvas.height = height
    }
    window.addEventListener('resize', handleResize)

    // Cleanup
    return () => {
      cancelAnimationFrame(animationId)
      window.removeEventListener('resize', handleResize)
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 0 }}
      aria-hidden="true"
    />
  )
}
