import { expect, test } from '@playwright/test'

const palettes = ['aurora', 'nexus', 'paper', 'ocean', 'forest', 'sakura'] as const

interface PaletteSignature {
  palette: string
  brand: string
  canvas: string
  surface: string
  text: string
  border: string
}

test('all palettes apply distinct visual token signatures', async ({ page }, testInfo) => {
  test.setTimeout(60_000)
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await expect(page.locator('body')).toBeVisible()

  const skipIntro = page.getByRole('button', { name: /skip intro/i })
  if (await skipIntro.isVisible().catch(() => false)) {
    await skipIntro.click()
  }

  await page.waitForLoadState('networkidle')
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    `,
  })

  const signatures: PaletteSignature[] = []

  for (const palette of palettes) {
    const signature = await readPaletteSignature(page, palette)

    expect(signature.palette).toBe(palette)
    expect(signature.brand).not.toBe('')
    expect(signature.canvas).not.toBe('')
    expect(signature.surface).not.toBe('')
    expect(signature.text).not.toBe('')
    expect(signature.border).not.toBe('')
    signatures.push(signature)

    await testInfo.attach(`palette-${palette}`, {
      body: await page.screenshot({ animations: 'disabled', fullPage: false }),
      contentType: 'image/png',
    })
  }

  const uniqueSignatures = new Set(
    signatures.map(({ brand, canvas, surface, text, border }) =>
      JSON.stringify({ brand, canvas, surface, text, border }),
    ),
  )

  expect(
    uniqueSignatures.size,
    `Every palette should resolve to a distinct token set: ${JSON.stringify(signatures, null, 2)}`,
  ).toBe(palettes.length)
})

async function readPaletteSignature(page: import('@playwright/test').Page, palette: string): Promise<PaletteSignature> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await page.evaluate((nextPalette) => {
        const root = document.documentElement
        root.setAttribute('data-palette', nextPalette)
        root.setAttribute('data-appearance', 'light')
        root.setAttribute('data-motion', 'reduced')
        root.classList.remove('dark')
      }, palette)

      await page.waitForFunction(() => {
        const styles = window.getComputedStyle(document.documentElement)
        return ['--brand', '--canvas', '--surface-1', '--text-default', '--border-default'].every(
          (token) => styles.getPropertyValue(token).trim() !== '',
        )
      })

      return await page.evaluate((): PaletteSignature => {
        const root = document.documentElement
        const styles = window.getComputedStyle(root)
        return {
          palette: root.getAttribute('data-palette') || '',
          brand: styles.getPropertyValue('--brand').trim(),
          canvas: styles.getPropertyValue('--canvas').trim(),
          surface: styles.getPropertyValue('--surface-1').trim(),
          text: styles.getPropertyValue('--text-default').trim(),
          border: styles.getPropertyValue('--border-default').trim(),
        }
      })
    } catch (error) {
      if (!(error instanceof Error) || !/Execution context was destroyed/.test(error.message) || attempt === 1) {
        throw error
      }
      await page.waitForLoadState('domcontentloaded')
    }
  }

  throw new Error('Palette signature could not be read.')
}
