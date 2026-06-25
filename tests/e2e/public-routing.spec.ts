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
