import { expect, test } from '@playwright/test'

const publicPaths = ['/', '/sign-in', '/sign-up', '/forgot-password', '/privacy', '/terms', '/support'] as const
const protectedStudentPaths = [
  '/dashboard',
  '/learn',
  '/practice',
  '/practice/session',
  '/revision',
  '/revision/formulas',
  '/revision/mistakes',
  '/revision/queue',
  '/planner',
  '/analytics',
  '/resources',
  '/tutor',
  '/settings',
  '/settings/academic',
  '/profile',
  '/exams',
  '/exams/boards',
  '/exams/jee',
  '/exams/custom',
  '/achievements',
] as const

for (const path of publicPaths) {
  test(`${path} stays public`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/sign-in\?callbackUrl=/)
  })
}

for (const path of protectedStudentPaths) {
  test(`${path} rejects anonymous access without a server error`, async ({ page }) => {
    const response = await page.goto(path, { waitUntil: 'domcontentloaded' })
    expect(response?.status()).toBeLessThan(500)
    await page.waitForURL((url) => url.pathname === '/sign-in', { timeout: 10_000 })
    await expect(page.getByRole('heading', { name: 'Sign in to Lernio' })).toBeVisible()
  })
}

test('manifest, robots and sitemap stay public', async ({ request }) => {
  for (const path of ['/manifest.webmanifest', '/robots.txt', '/sitemap.xml']) {
    const response = await request.get(path)
    expect(response.status(), `${path} returned ${response.status()}`).toBeLessThan(400)
  }
})
