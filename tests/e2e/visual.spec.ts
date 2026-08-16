import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const
const appearances = ['light', 'dark'] as const
const REQUIRED_TOKENS = ['--canvas', '--surface-1', '--text-default', '--border-default', '--focus-ring', '--brand'] as const

test('every palette resolves valid light and dark tokens without layout overflow', async ({ page }, testInfo) => {
  test.setTimeout(120_000)
  await page.addInitScript(() => {
    sessionStorage.setItem('lernio-cinematic-intro-v4', 'complete')
    document.documentElement.dataset.motion = 'none'
  })
  await page.goto('/', { waitUntil: 'networkidle' })
  await expect(page.locator('body')).toBeVisible()

  const signatures = new Map<string, string>()
  for (const palette of palettes) {
    let lightSignature = ''
    let darkSignature = ''
    for (const appearance of appearances) {
      const snapshot = await page.evaluate(({ nextPalette, nextAppearance, requiredTokens }) => {
        const root = document.documentElement
        root.setAttribute('data-palette', nextPalette)
        root.setAttribute('data-appearance', nextAppearance)
        root.setAttribute('data-motion', 'none')
        root.classList.toggle('dark', nextAppearance === 'dark')
        root.style.colorScheme = nextAppearance
        const style = getComputedStyle(root)
        const tokens = Object.fromEntries(requiredTokens.map((token) => [token, style.getPropertyValue(token).trim()]))
        return { tokens, colorScheme: style.colorScheme, scrollWidth: root.scrollWidth, clientWidth: root.clientWidth }
      }, { nextPalette: palette, nextAppearance: appearance, requiredTokens: REQUIRED_TOKENS })

      for (const token of REQUIRED_TOKENS) expect(snapshot.tokens[token], `${palette}/${appearance} must resolve ${token}`).not.toBe('')
      expect(snapshot.colorScheme).toContain(appearance)
      expect(snapshot.scrollWidth, `${palette}/${appearance} introduces horizontal overflow`).toBeLessThanOrEqual(snapshot.clientWidth + 1)

      const signature = REQUIRED_TOKENS.map((token) => snapshot.tokens[token]).join('|')
      const key = `${palette}/${appearance}`
      expect(signatures.has(signature), `${key} duplicates ${signatures.get(signature) ?? 'another theme'} exactly`).toBe(false)
      signatures.set(signature, key)
      if (appearance === 'light') lightSignature = signature
      else darkSignature = signature

      await testInfo.attach(`palette-${palette}-${appearance}`, {
        body: await page.screenshot({ fullPage: false, animations: 'disabled' }),
        contentType: 'image/png',
      })
    }
    expect(darkSignature, `${palette} dark mode must differ from light mode`).not.toBe(lightSignature)
  }
  expect(signatures.size).toBe(palettes.length * appearances.length)
})
