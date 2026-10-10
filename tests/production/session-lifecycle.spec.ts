import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

/**
 * Runs only against the short-lived PostgreSQL instance in GitHub CI and the
 * production-mode Next.js server started by playwright.production.config.ts.
 * NEVER point this test at the public Lernio deployment: it creates accounts.
 */
test('student can register, maintain a session, log out, and log back in in production mode', async ({ page }) => {
  test.setTimeout(120_000)

  const email = `prod-auth-${randomUUID()}@example.com`
  const password = 'LernioTest2026!Stable'
  const rollNumber = String(100000 + Math.floor(Math.random() * 900000))

  await page.goto('/sign-up')
  await expect(page.getByRole('heading', { name: 'Start with a student account' })).toBeVisible()

  await page.locator('input[name="name"]').fill('CI Stability Student')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(password)
  await page.locator('input[name="confirmPassword"]').fill(password)
  await page.locator('input[name="rollNumber"]').fill(rollNumber)
  await page.locator('select[name="departmentCode"]').selectOption('CIOT')
  await page.locator('select[name="semesterNumber"]').selectOption('3')
  await page.locator('select[name="division"]').selectOption('A')

  await page.getByRole('button', { name: /^Create profile$/ }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 45_000 })
  await expect(page.getByRole('heading', { name: /CI/i }).first()).toBeVisible()

  // Check the session from inside Chromium rather than Playwright's Node
  // request context: production Secure cookies on an HTTP loopback test host
  // may be accepted by the browser but omitted by Node's cookie jar.
  async function session() {
    return page.evaluate(async () => {
      const response = await fetch('/api/auth/session', {
        credentials: 'same-origin',
        cache: 'no-store',
      })
      if (!response.ok) throw new Error(`Session returned HTTP ${response.status}`)
      return response.json() as Promise<{ user?: { id?: string; email?: string; role?: string } }>
    })
  }

  const loggedIn = await session()
  expect(loggedIn.user?.id).toBeTruthy()
  expect(loggedIn.user?.email?.toLowerCase()).toBe(email)
  expect(loggedIn.user?.role).toBe('student')

  await page.reload()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
  await expect(page.locator('main h1').first()).toContainText('CI')
  expect((await session()).user?.email?.toLowerCase()).toBe(email)

  // Logout through the same-origin NextAuth endpoint using its CSRF token.
  // Browser-context requests share cookies with the open Playwright page.
  const signoutResult = await page.evaluate(async () => {
    const csrfResponse = await fetch('/api/auth/csrf', { credentials: 'same-origin' })
    if (!csrfResponse.ok) throw new Error(`CSRF request failed: ${csrfResponse.status}`)
    const csrfData = await csrfResponse.json() as { csrfToken?: string }
    if (!csrfData.csrfToken) throw new Error('Missing NextAuth CSRF token')
    const signout = await fetch('/api/auth/signout', {
      method: 'POST',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        csrfToken: csrfData.csrfToken,
        callbackUrl: `${window.location.origin}/sign-in`,
        json: 'true',
      }),
    })
    return { ok: signout.ok, status: signout.status }
  })
  expect(signoutResult.ok).toBe(true)
  expect((await session()).user?.id).toBeUndefined()

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/, { timeout: 20_000 })

  // Returning login must work after sign-out, without changing origin.
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 })
  await expect(page.locator('main h1').first()).toContainText('CI', { timeout: 20_000 })
  await expect.poll(async () => (await session()).user?.email?.toLowerCase(), {
    timeout: 15_000,
    message: 'Returning login must establish a persistent same-origin session',
  }).toBe(email)
})
