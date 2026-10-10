import { expect, test } from '@playwright/test'

test('the sign-in page is visible, interactive and does not automatically reload', async ({ page }) => {
  test.setTimeout(45_000)
  const navigations: string[] = []
  page.on('framenavigated', (frame) => {
    if (frame === page.mainFrame()) navigations.push(frame.url())
  })
  await page.emulateMedia({ colorScheme: 'dark', reducedMotion: 'reduce' })
  await page.goto('/sign-in', { waitUntil: 'domcontentloaded' })

  await expect(page.getByRole('heading', { name: 'Sign in to Lernio' })).toBeVisible()
  await expect(page.getByLabel('Email')).toBeEditable()
  await expect(page.getByLabel('Password')).toBeEditable()
  // Defaults are intentionally light-first even on a device in dark mode.
  await expect(page.locator('html')).not.toHaveClass(/dark/)

  const firstNavigationCount = navigations.length
  await page.waitForTimeout(700)
  expect(navigations.length).toBe(firstNavigationCount)
  await page.getByLabel('Email').fill('student@example.com')
  await expect(page.getByLabel('Email')).toHaveValue('student@example.com')
})

test('the legacy worker retires without navigating open tabs or caching application scripts', async ({ request, page }) => {
  const response = await request.get('/sw.js')
  expect(response.ok()).toBe(true)
  const script = await response.text()
  expect(script).toContain('self.registration.unregister()')
  expect(script).not.toContain('client.navigate(')
  expect(script).not.toContain("addEventListener('fetch'")

  await page.goto('/sign-in')
  const registrations = await page.evaluate(async () => {
    if (!('serviceWorker' in navigator)) return []
    return (await navigator.serviceWorker.getRegistrations()).map((registration) => registration.scope)
  })
  expect(registrations).toEqual([])
})

test('saved explicit dark appearance remains respected on refresh', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('lernio-theme-prefs', JSON.stringify({ appearance: 'dark', palette: 'aurora' }))
  })
  await page.goto('/sign-in')
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('heading', { name: 'Sign in to Lernio' })).toBeVisible()
  await page.reload()
  await expect(page.locator('html')).toHaveClass(/dark/)
  await expect(page.getByRole('heading', { name: 'Sign in to Lernio' })).toBeVisible()
})
