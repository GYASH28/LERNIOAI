'use client'

/**
 * DevOverlayCleanup previously scanned the DOM on every mutation to hide
 * the Next.js development/rendering status indicator.
 *
 * This was a massive performance bottleneck because it ran querySelectorAll('*')
 * recursively across the entire document body for every DOM mutation.
 *
 * Instead of dynamically hiding the indicator via DOM traversal, we have disabled
 * the devIndicators config natively in next.config.ts. Thus, this component now
 * returns null immediately without setting up any MutationObservers.
 */
export function DevOverlayCleanup() {
  return null
}
