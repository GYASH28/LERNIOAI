import { describe, expect, it } from 'vitest'
import { THEME_MOTION_SIGNATURES, getThemeMotion } from './theme-motion'
import type { Palette } from '@/lib/theme-types'

describe('theme motion registry', () => {
  it('defines a distinct motion signature for every palette', () => {
    const palettes: Palette[] = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura']

    expect(Object.keys(THEME_MOTION_SIGNATURES).sort()).toEqual([...palettes].sort())
    expect(new Set(palettes.map((palette) => getThemeMotion(palette).atmosphere.kind)).size).toBe(6)
    expect(new Set(palettes.map((palette) => getThemeMotion(palette).pageEnter.ease)).size).toBeGreaterThan(2)
  })

  it('uses restrained ambient recipes', () => {
    for (const palette of Object.keys(THEME_MOTION_SIGNATURES) as Palette[]) {
      const signature = getThemeMotion(palette)

      expect(signature.atmosphere.maxNodes).toBeLessThanOrEqual(8)
      expect(signature.atmosphere.opacity).toBeLessThanOrEqual(0.18)
      expect(signature.pageEnter.duration).toBeLessThanOrEqual(0.55)
      expect(signature.themeSwitch.duration).toBeLessThanOrEqual(0.55)
    }
  })
})
