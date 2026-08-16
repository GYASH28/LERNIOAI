import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const
const REQUIRED_TOKENS = [
  '--canvas',
  '--surface-1',
  '--text-default',
  '--border-default',
  '--focus-ring',
  '--brand',
] as const

test('every palette resolves distinct visual tokens without layout overflow', async ({ page }, testInfo) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()

  const signatures = new Map<string, string>()

  for (const palette of palettes) {
    const snapshot = await page.evaluate(
      ({ nextPalette, requiredTokens }) => {
        const root = document.documentElement
        root.setAttribute('data-palette', nextPalette)
        root.setAttribute('data-appearance', 'light')
        root.setAttribute('data-motion', 'reduced')
        root.classList.remove('dark')

        const style = getComputedStyle(root)
        const tokens = Object.fromEntries(
          requiredTokens.map((token) => [token, style.getPropertyValue(token).trim()]),
        )

        return {
          tokens,
          scrollWidth: root.scrollWidth,
          clientWidth: root.clientWidth,
        }
      },
      { nextPalette: palette, requiredTokens: REQUIRED_TOKENS },
    )

    for (const token of REQUIRED_TOKENS) {
      expect(snapshot.tokens[token], `${palette} must resolve ${token}`).not.toBe('')
    }
    expect(
      snapshot.scrollWidth,
      `${palette} introduces horizontal overflow (${snapshot.scrollWidth}px > ${snapshot.clientWidth}px)`,
    ).toBeLessThanOrEqual(snapshot.clientWidth + 1)

    const signature = REQUIRED_TOKENS.map((token) => snapshot.tokens[token]).join('|')
    expect(signatures.has(signature), `${palette} duplicates another palette's effective token set`).toBe(false)
    signatures.set(signature, palette)

    await testInfo.attach(`palette-${palette}`, {
      body: await page.screenshot({ fullPage: true, animations: 'disabled' }),
      contentType: 'image/png',
    })
  }

  expect(signatures.size).toBe(palettes.length)
})
