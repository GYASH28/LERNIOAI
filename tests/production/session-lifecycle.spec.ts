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

  const authRequest = page.context().request
  async function session() {
    const res = await authRequest.get('/api/auth/session', { headers: { 'Cache-Control': 'no-cache' } })
    expect(res.status()).toBe(200)
    return res.json() as Promise<{ user?: { id?: string; email?: string; role?: string } }>
  }

  const loggedIn = await session()
  expect(loggedIn.user?.id).toBeTruthy()
  expect(loggedIn.user?.email?.toLowerCase()).toBe(email)
  expect(loggedIn.user?.role).toBe('student')

  await page.reload()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/)
  await expect(page.getByText('CI Stability Student', { exact: false }).first()).toBeVisible()
  expect((await session()).user?.email?.toLowerCase()).toBe(email)

  // Logout through the same-origin NextAuth endpoint using its CSRF token.
  // Browser-context requests share cookies with the open Playwright page.
  const csrf = await authRequest.get('/api/auth/csrf')
  expect(csrf.status()).toBe(200)
  const csrfData = await csrf.json() as { csrfToken?: string }
  expect(csrfData.csrfToken).toBeTruthy()

  const signout = await authRequest.post('/api/auth/signout', {
    form: { csrfToken: csrfData.csrfToken!, callbackUrl: 'http://127.0.0.1:3001/sign-in' },
  })
  expect(signout.ok()).toBe(true)
  expect((await session()).user?.id).toBeUndefined()

  await page.goto('/dashboard')
  await expect(page).toHaveURL(/\/sign-in\?callbackUrl=/, { timeout: 20_000 })

  // Returning login must work after sign-out, without changing origin.
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /^Sign in$/ }).click()
  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 30_000 })
  expect((await session()).user?.email?.toLowerCase()).toBe(email)
})
