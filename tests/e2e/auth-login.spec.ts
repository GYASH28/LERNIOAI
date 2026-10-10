import { randomUUID } from 'node:crypto'
import { expect, test } from '@playwright/test'

test('new student registration and credential sign-in keep an authenticated session on the same host', async ({
  page,
  request,
}) => {
  test.setTimeout(90_000)

  const id = randomUUID().replace(/-/g, '')
  const email = `login-e2e-${id}@example.test`
  const password = 'LernioSmoke!2026'
  const rollNumber = `9${parseInt(id.slice(0, 8), 16).toString().slice(-5).padStart(5, '0')}`

  const registration = await request.post('/api/auth/register', {
    data: {
      name: 'Lernio Login E2E',
      email,
      password,
      rollNumber,
      departmentCode: 'CIOT',
      semesterNumber: 3,
      division: 'A',
    },
  })
  const registrationJson = await registration.json()
  expect(
    registration.ok(),
    `Registration failed: ${JSON.stringify(registrationJson)}`,
  ).toBe(true)
  expect(registrationJson.ok).toBe(true)
  expect(registrationJson.data?.user?.email).toBe(email)

  await page.goto('/sign-in?callbackUrl=%2Fmaterials')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(password)
  await page.getByRole('button', { name: /^sign in$/i }).click()

  // This catches both broken auth cookies and redirects to the obsolete
  // Vercel hostname: session verification happens before navigation.
  await expect(page).toHaveURL(/\/materials(?:[?#]|$)/, { timeout: 30_000 })
  const currentUrl = new URL(page.url())
  expect(currentUrl.pathname).toBe('/materials')

  const profile = await page.request.get('/api/user', {
    failOnStatusCode: false,
  })
  expect(profile.status()).toBe(200)
  const json = await profile.json()
  expect(json.ok).toBe(true)
  expect(json.data?.email).toBe(email)
  expect(json.data?.role).toBe('student')

  const providers = await page.request.get('/api/auth/providers')
  expect(providers.ok()).toBe(true)
  const providersJson = await providers.json()
  const credentials = providersJson.credentials
  expect(credentials).toBeTruthy()
  const callbackOrigin = new URL(credentials.callbackUrl)
  // Playwright's web server uses 127.0.0.1 while NEXTAUTH_URL in CI uses
  // localhost. They are equivalent loopback origins for this local-only test.
  const localHosts = new Set(['localhost', '127.0.0.1'])
  if (localHosts.has(currentUrl.hostname)) {
    expect(localHosts.has(callbackOrigin.hostname)).toBe(true)
    expect(callbackOrigin.port).toBe(currentUrl.port)
  } else {
    // Production/preview callbacks must never switch to an obsolete hostname.
    expect(callbackOrigin.origin).toBe(currentUrl.origin)
  }
})
