/**
 * Haptic feedback utility for mobile devices.
 * Uses navigator.vibrate() — no-op on devices that don't support it.
 * All calls are wrapped in try/catch to prevent crashes.
 */

type HapticPattern = 'short' | 'double' | 'long' | 'warning' | 'success' | 'error' | 'levelup'

const PATTERNS: Record<HapticPattern, number | number[]> = {
  short: 10,           // Quick tap (marking attendance)
  double: [10, 30, 10], // Double buzz (posting announcement)
  long: 50,             // Long buzz (saving)
  warning: [50, 50, 50], // Warning (deleting)
  success: [10, 40, 20], // Success pattern
  error: [100, 50, 100], // Error pattern
  levelup: [20, 40, 20, 40, 60], // Level-up celebration
}

export function haptic(pattern: HapticPattern = 'short') {
  try {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      navigator.vibrate(PATTERNS[pattern])
    }
  } catch {
    // Silently fail — haptics are non-critical
  }
}
