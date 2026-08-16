import { expect, test } from '@playwright/test'

const routes = ['/', '/sign-in', '/sign-up'] as const

for (const route of routes) {
  test(`${route} paints and stays inside the viewport`, async ({ page }) => {
    const pageErrors: string[] = []
    page.on('pageerror', (error) => pageErrors.push(error.message))

    const response = await page.goto(route, { waitUntil: 'domcontentloaded' })
    expect(response?.ok(), `${route} must return a successful document response`).toBe(true)
    await expect(page.locator('body')).toBeVisible()

    const paint = await page.evaluate(() => {
      const bodyText = document.body.innerText.trim()
      const root = document.documentElement
      const entries = performance.getEntriesByType('paint')
        .map((entry) => ({ name: entry.name, startTime: entry.startTime }))

      return {
        bodyTextLength: bodyText.length,
        clientWidth: root.clientWidth,
        scrollWidth: root.scrollWidth,
        paints: entries,
      }
    })

    expect(paint.bodyTextLength, `${route} rendered an empty body`).toBeGreaterThan(10)
    expect(
      paint.scrollWidth,
      `${route} horizontally overflows (${paint.scrollWidth}px > ${paint.clientWidth}px)`,
    ).toBeLessThanOrEqual(paint.clientWidth + 2)
    expect(pageErrors, `${route} emitted uncaught page errors`).toEqual([])
  })
}
