import { createHash } from 'node:crypto'
import { expect, test } from '@playwright/test'
import sharp from 'sharp'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

function sha256(buffer: Buffer) {
  return createHash('sha256').update(buffer).digest('hex')
}

async function changedPixelRatio(first: Buffer, second: Buffer) {
  const [a, b] = await Promise.all([
    sharp(first).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
    sharp(second).removeAlpha().raw().toBuffer({ resolveWithObject: true }),
  ])

  expect(a.info.width).toBe(b.info.width)
  expect(a.info.height).toBe(b.info.height)
  expect(a.info.channels).toBe(b.info.channels)

  const channels = a.info.channels
  const pixels = a.info.width * a.info.height
  let changed = 0

  for (let pixel = 0; pixel < pixels; pixel += 1) {
    const offset = pixel * channels
    let maxDelta = 0
    for (let channel = 0; channel < Math.min(3, channels); channel += 1) {
      maxDelta = Math.max(maxDelta, Math.abs(a.data[offset + channel] - b.data[offset + channel]))
    }
    // Ignore tiny antialiasing/font-rasterization noise.
    if (maxDelta > 12) changed += 1
  }

  return changed / Math.max(1, pixels)
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

  // Every supported palette should produce a distinct rendered state.
  expect(new Set(hashes.values()).size).toBe(palettes.length)

  // Re-applying the same palette should remain visually stable. Compare pixels
  // instead of PNG bytes because headless Chromium may change encoding or a
  // tiny amount of font antialiasing without changing the actual layout.
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-palette', 'aurora')
  })
  await expect(page.locator('html')).toHaveAttribute('data-palette', 'aurora')
  const repeatedAurora = await page.screenshot({ animations: 'disabled' })
  expect(auroraScreenshot).not.toBeNull()
  const drift = await changedPixelRatio(auroraScreenshot!, repeatedAurora)
  expect(drift, `Aurora visual drift was ${(drift * 100).toFixed(2)}%`).toBeLessThanOrEqual(0.01)

  await testInfo.attach('landing-aurora-stable', {
    body: repeatedAurora,
    contentType: 'image/png',
  })
})
