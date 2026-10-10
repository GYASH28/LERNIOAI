import { expect, test } from '@playwright/test'

test('production login hydrates with strict CSP and shows a real credential error', async ({ page }) => {
  const runtimeErrors: string[] = []
  page.on('pageerror', (error) => runtimeErrors.push(error.message))
  page.on('console', (message) => {
    if (message.type() === 'error' && /content security policy|hydration|refused to execute script/i.test(message.text())) {
      runtimeErrors.push(message.text())
    }
  })

  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  const response = await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  const csp = response?.headers()['content-security-policy'] ?? ''
  expect(csp).toContain("script-src")
  expect(csp).toMatch(/nonce-/)

  await expect(page.getByRole('heading', { name: /Sign in to Lernio/ })).toBeVisible()
  await expect(page.locator('html')).not.toHaveClass(/dark/)
  await page.getByLabel('Email').fill('no-such-student@lernio.invalid')
  await page.getByLabel('Password').fill('not-a-real-password')
  await page.getByRole('button', { name: /^sign in$/i }).click()

  // This message is set by the React click handler after NextAuth responds.
  // If inline RSC scripts are blocked or hydration fails, it will never appear.
  await expect(page.getByText('Invalid email or password.')).toBeVisible({ timeout: 25_000 })
  expect(runtimeErrors).toEqual([])
})

test('production landing is navigable without a dark intro takeover or stale service worker', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lernio-cinematic-intro-v4', 'complete')
    sessionStorage.setItem('lernio-cinematic-intro-v4', 'complete')
  })
  await page.emulateMedia({ reducedMotion: 'reduce' })
  const response = await page.goto('/', { waitUntil: 'domcontentloaded' })
  expect(response?.status()).toBe(200)
  await expect(page.getByRole('heading', { name: 'One Academic System. Every CWIT Semester.' })).toBeVisible()
  const before = page.url()
  await page.getByRole('link', { name: /start learning/i }).first().click()
  await expect(page).toHaveURL(/\/sign-up/)
  expect(before).not.toBe(page.url())

  const scopes = await page.evaluate(async () => (
    'serviceWorker' in navigator
      ? (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.scope)
      : []
  ))
  expect(scopes).toEqual([])
})


test('production exposes safe release metadata with no caching', async ({ request }) => {
  const response = await request.get('/api/release')
  expect(response.status()).toBe(200)
  expect(response.headers()['cache-control']).toContain('no-store')
  const payload = await response.json()
  expect(payload.app).toBe('lernio')
  expect(payload.revision === null || /^[a-f0-9]{40}$/.test(payload.revision)).toBe(true)
  expect(['local', 'preview', 'production']).toContain(payload.stage)
  expect(Object.keys(payload).sort()).toEqual(['app', 'revision', 'stage'])
})

test('NextAuth providers publish current canonical sign-in/callback URLs even with a stale NEXTAUTH_URL', async ({ request }) => {
  const response = await request.get('/api/auth/providers')
  expect(response.status()).toBe(200)
  const providers = await response.json()
  expect(providers.credentials).toBeTruthy()
  expect(providers.credentials.signinUrl).toBe('http://127.0.0.1:3001/api/auth/signin/credentials')
  expect(providers.credentials.callbackUrl).toBe('http://127.0.0.1:3001/api/auth/callback/credentials')
  expect(Object.keys(providers)).toEqual(['credentials'])
})
