import { expect, test } from '@playwright/test'
import { hash } from 'bcryptjs'
import { db } from '../../src/lib/db'

const EMAIL = 'e2e.student@tests.lernio.local'
const PASSWORD = 'E2e-Strong-Password-2026!'

test.beforeAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } })
  await db.user.create({
    data: {
      email: EMAIL,
      emailVerified: new Date(),
      name: 'E2E Student',
      passwordHash: await hash(PASSWORD, 12),
      role: 'student',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      onboarded: true,
    },
  })
})

test.afterAll(async () => {
  await db.user.deleteMany({ where: { email: EMAIL } })
})

test('student credentials reject a bad password and then open the authenticated dashboard', async ({ page }) => {
  const pageErrors: string[] = []
  page.on('pageerror', (error) => pageErrors.push(error.message))

  await page.goto('/sign-in')
  await expect(page.getByRole('heading', { name: 'Sign in to Lernio' })).toBeVisible()

  await page.getByLabel('Email').fill(EMAIL)
  await page.getByLabel('Password').fill('definitely-wrong-password')
  await page.getByRole('button', { name: 'Sign in' }).click()
  await expect(page.getByText('Invalid email or password.')).toBeVisible()
  await expect(page).toHaveURL(/\/sign-in/)

  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Sign in' }).click()

  await expect(page).toHaveURL(/\/dashboard(?:\?|$)/, { timeout: 15_000 })
  await expect(page.getByText('Complete your profile')).toBeVisible()
  await expect(page.getByText(/E2E/).first()).toBeVisible()

  const cookies = await page.context().cookies()
  expect(
    cookies.some((cookie) => cookie.name.includes('next-auth.session-token')),
    'A successful credential login must create a NextAuth session cookie',
  ).toBe(true)
  expect(pageErrors, 'Authenticated journey emitted uncaught page errors').toEqual([])
})
