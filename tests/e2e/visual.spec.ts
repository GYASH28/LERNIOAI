import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

test('palette switching produces stable, distinct visual output', async ({ page }, testInfo) => {
  test.setTimeout(60_000)

  await page.addInitScript(() => {
    window.sessionStorage.setItem('lernio-cinematic-intro-v4', 'complete')
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()
  await expect(page.getByRole('button', { name: /replay intro/i })).toBeVisible()

  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation: none !important;
        transition: none !important;
        caret-color: transparent !important;
      }
    `,
  })

  const hashes = new Map<string, string>()
  let auroraScreenshot: Buffer | null = null

  for (const palette of palettes) {
    await page.evaluate((nextPalette) => {
      document.documentElement.setAttribute('data-palette', nextPalette)
      document.documentElement.setAttribute('data-appearance', 'light')
      document.documentElement.setAttribute('data-motion', 'reduced')
    }, palette)
    await expect(page.locator('html')).toHaveAttribute('data-palette', palette)

    const screenshot = await page.screenshot({ animations: 'disabled' })
    hashes.set(palette, sha256(screenshot))
    if (palette === 'aurora') auroraScreenshot = screenshot
  }

  // All supported palettes should create a visibly distinct rendered state.
  expect(new Set(hashes.values()).size).toBe(palettes.length)

  // Re-applying the same palette must be deterministic within a run. This
  // catches animated/unstable landing output without requiring uncommitted
  // binary snapshot files in the repository.
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-palette', 'aurora')
  })
  const repeatedAurora = await page.screenshot({ animations: 'disabled' })
  expect(auroraScreenshot).not.toBeNull()
  expect(repeatedAurora.equals(auroraScreenshot!)).toBe(true)

  await testInfo.attach('landing-aurora-stable', {
    body: repeatedAurora,
    contentType: 'image/png',
  })
})
