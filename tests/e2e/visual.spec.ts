import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

test('all palette attributes can be applied before visual capture', async ({ page }, testInfo) => {
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
    await testInfo.attach(`palette-${palette}.png`, {
      body: await page.screenshot({ animations: 'disabled', timeout: 10_000 }),
      contentType: 'image/png',
    })
  }
})
