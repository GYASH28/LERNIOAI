import { expect, test } from '@playwright/test'

const publicPaths = ['/', '/sign-in', '/sign-up', '/forgot-password', '/privacy', '/terms', '/support']

for (const path of publicPaths) {
  test(`${path} stays public`, async ({ page }) => {
    const response = await page.goto(path)
    expect(response?.status()).toBeLessThan(400)
    await expect(page).not.toHaveURL(/\/sign-in\?callbackUrl=/)
  })
}

test('manifest and sitemap stay public', async ({ request }) => {
  const manifest = await request.get('/manifest.webmanifest')
  expect(manifest.status()).toBeLessThan(400)

  const sitemap = await request.get('/sitemap.xml')
  expect(sitemap.status()).toBeLessThan(400)
})

test('signed-out protected navigation does not poll private APIs', async ({ page }) => {
  const unauthorizedPrivateRequests: string[] = []

  page.on('response', (response) => {
    if (
      response.status() === 401 &&
      /\/api\/(achievements\/new|notifications)(?:\?|$)/.test(response.url())
    ) {
      unauthorizedPrivateRequests.push(response.url())
    }
  })

  await page.goto('/learn')
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=(?:%2F|\/)learn/i)
  await page.waitForTimeout(500)

  expect(unauthorizedPrivateRequests).toEqual([])
})

test('obsolete gamification destinations consolidate into useful study pages', async ({ request }) => {
  const redirects = [
    ['/games', '/practice'],
    ['/leaderboard', '/analytics'],
    ['/achievements', '/profile'],
  ] as const

  for (const [source, destination] of redirects) {
    const response = await request.get(source, { maxRedirects: 0 })
    expect([307, 308]).toContain(response.status())
    expect(response.headers().location).toBe(destination)
  }
})
