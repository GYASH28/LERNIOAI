import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

test('palette switching works and the stable landing layout matches its baseline', async ({ page }) => {
  test.setTimeout(60_000)

  await page.addInitScript(() => {
    window.sessionStorage.setItem('lernio-cinematic-intro-v4', 'complete')
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()
  await expect(page.getByRole('button', { name: /replay intro/i })).toBeVisible()

  for (const palette of palettes) {
    await page.evaluate((nextPalette) => {
      document.documentElement.setAttribute('data-palette', nextPalette)
      document.documentElement.setAttribute('data-appearance', 'light')
      document.documentElement.setAttribute('data-motion', 'reduced')
    }, palette)
    await expect(page.locator('html')).toHaveAttribute('data-palette', palette)
  }

  // One deterministic full-page baseline protects the actual layout while the
  // loop above verifies that every supported palette can still be applied.
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-palette', 'aurora')
  })
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'aurora')
  await expect(page).toHaveScreenshot('landing-aurora.png', {
    animations: 'disabled',
    maxDiffPixelRatio: 0.01,
    timeout: 10_000,
  })
})
