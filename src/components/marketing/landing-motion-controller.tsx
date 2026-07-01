'use client'

import { useEffect } from 'react'

const ITEM_SELECTOR = [
  ':scope li',
  ':scope article',
  ':scope .academic-os-stat',
  ':scope .academic-os-layer',
  ':scope [role="tabpanel"]',
].join(',')

export function LandingMotionController() {
  useEffect(() => {
    const root = document.documentElement
    const reduced =
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      root.dataset.motion === 'reduced' ||
      root.dataset.motion === 'none' ||
      root.dataset.lowPower === 'true'

    root.dataset.landingMotion = reduced ? 'reduced' : 'enhanced'

    const sections = Array.from(
      document.querySelectorAll<HTMLElement>('main > section:not([data-landing-hero])'),
    )

    sections.forEach((section) => {
      section.dataset.landingSection = 'pending'
      Array.from(section.querySelectorAll<HTMLElement>(ITEM_SELECTOR))
        .slice(0, 16)
        .forEach((item, index) => {
          item.dataset.landingItem = 'true'
          item.style.setProperty('--landing-item-index', String(index))
          item.style.setProperty('--landing-item-delay', `${Math.min(index, 8) * 55}ms`)
        })
    })

    if (reduced || !('IntersectionObserver' in window)) {
      sections.forEach((section) => {
        section.dataset.landingSection = 'revealed'
      })
      return
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue
          const section = entry.target as HTMLElement
          section.dataset.landingSection = 'revealed'
          observer.unobserve(section)
        }
      },
      {
        threshold: 0.12,
        rootMargin: '0px 0px -8% 0px',
      },
    )

    sections.forEach((section) => observer.observe(section))

    return () => {
      observer.disconnect()
      delete root.dataset.landingMotion
    }
  }, [])

  return null
}
