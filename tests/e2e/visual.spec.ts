import { expect, test } from '@playwright/test'
import sharp from 'sharp'
import {
  visualSignatures,
  type VisualPalette,
  type VisualProject,
} from './visual-signatures'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const
const SIGNATURE_SIZE = 16
const MAX_MEAN_CHANNEL_DELTA = 5

async function compactVisualSignature(png: Buffer) {
  return sharp(png)
    .resize(SIGNATURE_SIZE, SIGNATURE_SIZE, { fit: 'fill' })
    .removeAlpha()
    .raw()
    .toBuffer()
}

function meanChannelDelta(actual: Buffer, expected: Buffer) {
  expect(actual.length).toBe(expected.length)
  let total = 0
  for (let index = 0; index < actual.length; index += 1) {
    total += Math.abs(actual[index] - expected[index])
  }
  return total / actual.length
}

test('all palettes preserve their approved visual signature', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  const project = testInfo.project.name as VisualProject
  expect(Object.hasOwn(visualSignatures, project), `Missing visual signatures for ${project}`).toBe(true)

  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()
  await page.evaluate(async () => {
    await document.fonts.ready
  })

  for (const palette of palettes) {
    await page.evaluate((nextPalette) => {
      document.documentElement.setAttribute('data-palette', nextPalette)
      document.documentElement.setAttribute('data-appearance', 'light')
      document.documentElement.setAttribute('data-motion', 'reduced')
    }, palette)

    await expect(page.locator('html')).toHaveAttribute('data-palette', palette)
    await page.evaluate(() => new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve()))))

    const screenshot = await page.screenshot({ animations: 'disabled' })
    const actual = await compactVisualSignature(screenshot)
    const expectedBase64 = visualSignatures[project][palette as VisualPalette]
    const expected = Buffer.from(expectedBase64, 'base64')
    const delta = meanChannelDelta(actual, expected)

    expect(
      delta,
      `${project}/${palette} visual signature drifted (mean channel delta ${delta.toFixed(2)} > ${MAX_MEAN_CHANNEL_DELTA}).`,
    ).toBeLessThanOrEqual(MAX_MEAN_CHANNEL_DELTA)
  }
})
