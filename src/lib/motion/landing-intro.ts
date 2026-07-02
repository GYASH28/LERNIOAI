export const LANDING_INTRO_STORAGE_KEY = 'lernio-cinematic-intro-v4'

export type LandingIntroMode = 'full' | 'compact' | 'reduced' | 'skip'

export interface LandingIntroSignals {
  hasSeenIntro: boolean
  prefersReducedMotion: boolean
  motionPreference: 'full' | 'reduced' | 'none'
  lowPower: boolean
  saveData: boolean
  effectiveType?: string
  deviceMemory?: number
}

export function resolveLandingIntroMode(signals: LandingIntroSignals): LandingIntroMode {
  if (signals.hasSeenIntro) return 'skip'
  if (signals.motionPreference === 'none') return 'skip'
  if (signals.prefersReducedMotion || signals.motionPreference === 'reduced') return 'reduced'

  const constrainedConnection =
    signals.saveData ||
    signals.effectiveType === 'slow-2g' ||
    signals.effectiveType === '2g'

  if (signals.lowPower || constrainedConnection) return 'compact'
  if (signals.deviceMemory !== undefined && signals.deviceMemory < 4) return 'compact'

  return 'full'
}

export function introDurationMs(mode: Exclude<LandingIntroMode, 'skip'>, viewportWidth: number) {
  if (mode === 'reduced') return 900
  if (mode === 'compact') return viewportWidth < 640 ? 2200 : 2600
  return viewportWidth < 640 ? 5200 : 7200
}
