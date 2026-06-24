import { describe, expect, it } from 'vitest'
import { canAnimate, resolveMotionPolicy } from './policy'

describe('resolveMotionPolicy', () => {
  it('turns low power into a reduced decorative policy', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'full',
      osReducedMotion: false,
      lowPower: true,
      strictExam: false,
      tabVisible: true,
    })

    expect(policy.level).toBe('reduced')
    expect(policy.ambientEnabled).toBe(false)
    expect(policy.blurEnabled).toBe(false)
    expect(policy.chartAnimationEnabled).toBe(false)
    expect(policy.durationScale).toBeLessThan(1)
  })

  it('keeps essential feedback available when motion is none', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'none',
      osReducedMotion: false,
      lowPower: false,
      strictExam: false,
      tabVisible: true,
    })

    expect(policy.level).toBe('none')
    expect(canAnimate(policy, 'essential')).toBe(true)
    expect(canAnimate(policy, 'decorative')).toBe(false)
    expect(canAnimate(policy, 'navigation')).toBe(false)
  })

  it('disables decorative motion in strict exams', () => {
    const policy = resolveMotionPolicy({
      userMotion: 'full',
      osReducedMotion: false,
      lowPower: false,
      strictExam: true,
      tabVisible: true,
    })

    expect(policy.ambientEnabled).toBe(false)
    expect(policy.mascotAnimationEnabled).toBe(false)
    expect(policy.celebrationsEnabled).toBe(false)
    expect(canAnimate(policy, 'feedback')).toBe(true)
  })
})
