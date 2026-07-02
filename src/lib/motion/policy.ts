import type { EffectiveMotionPolicy, MotionCategory, MotionPolicyInput } from './types'

export function resolveMotionPolicy(input: MotionPolicyInput): EffectiveMotionPolicy {
  const level = resolveEffectiveLevel(input)
  const fullMotion = level === 'full'
  const active = input.tabVisible && !input.strictExam

  return {
    level,
    ambientEnabled: fullMotion && active && !input.lowPower,
    decorativeEnabled: fullMotion && active && !input.lowPower,
    celebrationsEnabled: fullMotion && active && !input.lowPower,
    transformEnabled: level !== 'none',
    blurEnabled: fullMotion && !input.lowPower && !input.highContrast,
    chartAnimationEnabled: fullMotion && active && !input.lowPower,
    mascotAnimationEnabled: fullMotion && active && !input.lowPower,
    durationScale: level === 'full' ? 1 : level === 'reduced' ? 0.35 : 0,
    strictExam: input.strictExam,
    tabVisible: input.tabVisible,
    lowPower: input.lowPower,
  }
}

function resolveEffectiveLevel(input: MotionPolicyInput): EffectiveMotionPolicy['level'] {
  if (input.userMotion === 'none') return 'none'
  if (input.osReducedMotion || input.lowPower) return 'reduced'
  return input.userMotion
}

export function canAnimate(policy: EffectiveMotionPolicy, category: MotionCategory): boolean {
  if (category === 'essential') return true
  if (!policy.tabVisible) return false

  switch (category) {
    case 'feedback':
      return policy.level !== 'none'
    case 'navigation':
      return policy.level === 'full' && !policy.strictExam && !policy.lowPower
    case 'decorative':
      return policy.decorativeEnabled
    case 'ambient':
      return policy.ambientEnabled
    case 'celebration':
      return policy.celebrationsEnabled
    case 'chart':
      return policy.chartAnimationEnabled
    case 'mascot':
      return policy.mascotAnimationEnabled
    default:
      return false
  }
}
