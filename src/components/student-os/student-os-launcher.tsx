'use client'

/**
 * Compatibility export for the root layout.
 *
 * The former floating Student OS launcher intentionally renders nothing:
 * Student OS capabilities now live directly inside /learn, preventing a
 * second competing learning home from appearing over the main application.
 */
export function StudentOSLauncher() {
  return null
}
