import { describe, expect, it } from 'vitest'
import { introDurationMs, resolveLandingIntroMode } from './landing-intro'

const BASE = {
  hasSeenIntro: false,
  prefersReducedMotion: false,
  motionPreference: 'full' as const,
  lowPower: false,
  saveData: false,
  effectiveType: '4g',
  deviceMemory: 8,
}

describe('resolveLandingIntroMode', () => {
  it('skips for a returning visitor', () => {
    expect(resolveLandingIntroMode({ ...BASE, hasSeenIntro: true })).toBe('skip')
  })

  it('uses the reduced sequence when the OS asks for reduced motion', () => {
    expect(resolveLandingIntroMode({ ...BASE, prefersReducedMotion: true })).toBe('reduced')
  })

  it('uses the compact sequence for constrained devices', () => {
    expect(resolveLandingIntroMode({ ...BASE, lowPower: true })).toBe('compact')
    expect(resolveLandingIntroMode({ ...BASE, saveData: true })).toBe('compact')
    expect(resolveLandingIntroMode({ ...BASE, deviceMemory: 2 })).toBe('compact')
  })

  it('uses the full sequence for a capable first visit', () => {
    expect(resolveLandingIntroMode(BASE)).toBe('full')
  })
})

describe('introDurationMs', () => {
  it('keeps reduced motion brief and shortens full motion on mobile', () => {
    expect(introDurationMs('reduced', 1440)).toBe(650)
    expect(introDurationMs('compact', 390)).toBe(1500)
    expect(introDurationMs('compact', 1440)).toBe(1800)
    expect(introDurationMs('full', 390)).toBe(3200)
    expect(introDurationMs('full', 1440)).toBe(4200)
  })
})
