import type { MotionLevel, Palette } from '@/lib/theme-types'

export type MotionCategory =
  | 'essential'
  | 'navigation'
  | 'feedback'
  | 'decorative'
  | 'ambient'
  | 'celebration'
  | 'chart'
  | 'mascot'

export interface MotionPolicyInput {
  userMotion: MotionLevel
  osReducedMotion: boolean
  lowPower: boolean
  strictExam: boolean
  tabVisible: boolean
  highContrast?: boolean
}

export interface EffectiveMotionPolicy {
  level: MotionLevel
  ambientEnabled: boolean
  decorativeEnabled: boolean
  celebrationsEnabled: boolean
  transformEnabled: boolean
  blurEnabled: boolean
  chartAnimationEnabled: boolean
  mascotAnimationEnabled: boolean
  durationScale: number
  strictExam: boolean
  tabVisible: boolean
  lowPower: boolean
}

export type MotionEase = [number, number, number, number]

export interface MotionRecipe {
  duration: number
  distance: number
  scale?: number
  x?: number
  y?: number
  rotate?: number
  ease: string
  spring?: {
    stiffness: number
    damping: number
  }
}

export interface AtmosphereRecipe {
  kind: 'aurora' | 'circuit' | 'paper' | 'caustic' | 'dapple' | 'petal'
  opacity: number
  speedSeconds: number
  maxNodes: number
}

export interface MascotMotionRecipe {
  idle: MotionRecipe
  thinking: MotionRecipe
}

export interface CelebrationRecipe {
  kind: 'prism' | 'circuit' | 'ink' | 'bubble' | 'spore' | 'petal'
  particles: number
  duration: number
}

export interface ThemeSwitchRecipe {
  kind: 'wash' | 'scan' | 'page' | 'ripple' | 'dapple' | 'bloom'
  duration: number
  ease: string
}

export interface ThemeMotionSignature {
  palette: Palette
  pageEnter: MotionRecipe
  pageExit: MotionRecipe
  sectionEnter: MotionRecipe
  cardHover: MotionRecipe
  buttonPress: MotionRecipe
  tabChange: MotionRecipe
  dialogEnter: MotionRecipe
  atmosphere: AtmosphereRecipe
  mascotIdle: MascotMotionRecipe
  celebration: CelebrationRecipe
  themeSwitch: ThemeSwitchRecipe
}
