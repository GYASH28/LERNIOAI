import { expect, test } from '@playwright/test'
import axe from 'axe-core'

const PUBLIC_A11Y_PATHS = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/support',
] as const

for (const path of PUBLIC_A11Y_PATHS) {
  test(`${path} has no serious or critical WCAG A/AA violations`, async ({ page }) => {
    await page.goto(path, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    await page.addScriptTag({ content: axe.source })

    const results = await page.evaluate(async () => {
      const axeRunner = (window as unknown as {
        axe: {
          run: (context: Document, options: unknown) => Promise<{
            violations: Array<{
              impact: string | null
              id: string
              help: string
              nodes: Array<{ target: string[]; failureSummary?: string }>
            }>
          }>
        }
      }).axe

      return axeRunner.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'],
        },
        rules: {
          'target-size': { enabled: true },
        },
        resultTypes: ['violations'],
      })
    })

    const blockingViolations = results.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        nodes: violation.nodes.slice(0, 5),
      }))

    expect(
      blockingViolations,
      `Accessibility blockers on ${path}: ${JSON.stringify(blockingViolations, null, 2)}`,
    ).toEqual([])
  })
}
