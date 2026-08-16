import { expect, test } from '@playwright/test'

const forbiddenLegacyTerms = [
  /diploma/i,
  /CWIT/i,
  /department\s*\/\s*programme/i,
  /roll number/i,
  /select semester/i,
  /select division/i,
]

test('landing and auth surfaces are Class 11/12/JEE native', async ({ page }) => {
  for (const route of ['/', '/sign-in', '/sign-up'] as const) {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    const text = await page.locator('body').innerText()
    for (const legacy of forbiddenLegacyTerms) {
      expect(text, `${route} leaked legacy copy matching ${legacy}`).not.toMatch(legacy)
    }
  }

  await page.goto('/sign-up', { waitUntil: 'domcontentloaded' })
  await expect(page.getByRole('heading', { name: 'Start your Lernio workspace' })).toBeVisible()
  await expect(page.getByText(/class, stream, board\/JEE goal/i)).toBeVisible()
  await expect(page.getByRole('button', { name: 'Create account' })).toBeVisible()
})
