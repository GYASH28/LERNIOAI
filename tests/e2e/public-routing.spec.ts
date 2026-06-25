import { expect, test } from '@playwright/test'

const PUBLIC_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/support',
  '/manifest.webmanifest',
  '/sitemap.xml',
  '/robots.txt',
  '/brand/lernio-logo-symbol.png',
] as const

test.describe('public routing', () => {
  for (const route of PUBLIC_ROUTES) {
    test(`${route} is served without auth redirect`, async ({ request }) => {
      const response = await request.get(route, { maxRedirects: 0 })
      expect(response.status(), `${route} status`).toBeLessThan(400)
      expect(response.headers().location, `${route} should not redirect`).toBeUndefined()
    })
  }

  test('protected app route still redirects to sign in', async ({ request }) => {
    const response = await request.get('/dashboard', { maxRedirects: 0 })

    expect(response.status()).toBe(307)
    expect(response.headers().location).toBe(
      '/sign-in?callbackUrl=%2Fdashboard',
    )
  })
})
