import { expect, test } from '@playwright/test'
import axe from 'axe-core'

const routes = ['/', '/sign-in', '/sign-up', '/forgot-password', '/privacy', '/terms', '/support'] as const

for (const route of routes) {
  test(`${route} has no serious or critical WCAG violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
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
              nodes: Array<{ target: string[] }>
            }>
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

    const blocking = results.violations
      .filter((violation) => violation.impact === 'critical' || violation.impact === 'serious')
      .map((violation) => ({
        id: violation.id,
        impact: violation.impact,
        help: violation.help,
        targets: violation.nodes.flatMap((node) => node.target).slice(0, 8),
      }))

    expect(blocking, JSON.stringify(blocking, null, 2)).toEqual([])
  })
}
