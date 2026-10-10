import { expect, test } from '@playwright/test'
import axe from 'axe-core'

// Axe must inject its audit script into the document. That synthetic script
// cannot carry Lernio's per-request CSP nonce, so scope CSP bypass to this
// audit alone. Every other browser spec runs with the real policy enforced.
test.use({ bypassCSP: true })

test('home page has no critical accessibility violations', async ({ page }) => {
  await page.goto('/')
  await expect(page.locator('body')).toBeVisible()
  await page.addScriptTag({ content: axe.source })

  const results = await page.evaluate(async () => {
    const axeRunner = (window as unknown as {
      axe: {
        run: (context: Document, options: unknown) => Promise<{
          violations: Array<{ impact: string | null; id: string }>
        }>
      }
    }).axe

    return axeRunner.run(document, {
      runOnly: {
        type: 'tag',
        values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'],
      },
      resultTypes: ['violations'],
    })
  })

  const criticalViolations = results.violations.filter(
    (violation) => violation.impact === 'critical'
  )
  expect(criticalViolations).toEqual([])
})
