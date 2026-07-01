import { expect, test } from '@playwright/test'

/**
 * Audit fix #31 (CVSS 3.0): the previous version of this test captured 6
 * palette screenshots via `testInfo.attach` but never called
 * `toHaveScreenshot()`. There were no baseline images committed and no
 * diff threshold — the test always passed, providing zero regression
 * protection.
 *
 * Now each palette is asserted against a committed baseline PNG. If the
 * visual output drifts by more than 1% of pixels, the test fails. To
 * update baselines deliberately (e.g. after a design change), run:
 *
 *   npx playwright test tests/e2e/visual.spec.ts --update-snapshots
 *
 * Baselines live in `tests/e2e/visual.spec.ts-snapshots/`.
 */
const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

test('all palette attributes can be applied before visual capture', async ({ page }) => {
  test.setTimeout(60_000)
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()

  for (const palette of palettes) {
    await page.evaluate((nextPalette) => {
      document.documentElement.setAttribute('data-palette', nextPalette)
      document.documentElement.setAttribute('data-appearance', 'light')
      document.documentElement.setAttribute('data-motion', 'reduced')
    }, palette)

    await expect(page.locator('html')).toHaveAttribute('data-palette', palette)

    // Audit fix #31: real visual regression check with a 1% pixel-diff threshold.
    // First run will fail and write baseline PNGs to the snapshots dir; commit them.
    await expect(page).toHaveScreenshot(`palette-${palette}.png`, {
      animations: 'disabled',
      maxDiffPixelRatio: 0.01,
      timeout: 10_000,
    })
  }
})
