import { expect, test } from '@playwright/test'

const lessonUrl = '/materials/lesson/R23CP1701/logarithms-and-progressions'

test('Materials exposes five distinct lesson phases from one canonical note', async ({ page }) => {
  await page.goto(lessonUrl)

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath).toBeVisible()
  await expect(learningPath.getByRole('button')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'Learn', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Theory' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Simplify/ }).click()
  await expect(page.getByRole('heading', { name: 'Simplify', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Analogies' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Visualise/ }).click()
  await expect(page.getByRole('heading', { name: 'Visualise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Flowcharts|Diagrams|Tables/ }).first()).toBeVisible()

  await learningPath.getByRole('button', { name: /Practise/ }).click()
  await expect(page.getByRole('heading', { name: 'Practise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Quiz|Viva Q|Exam Q/ }).first()).toBeVisible()

  await learningPath.getByRole('button', { name: /Revise/ }).click()
  await expect(page.getByRole('heading', { name: 'Revise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Summary|Formulas|Flashcards/ }).first()).toBeVisible()
})

test('Materials keeps the five-phase controls usable on a 390px screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await page.goto(lessonUrl)

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath).toBeVisible()
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('Materials serves exact official CWIT scope without inventing unsupported phases', async ({ page }) => {
  await page.goto('/materials/lesson/R23CI2607/unit-1-introduction-to-database-system')

  await expect(page.getByRole('heading', { name: 'Introduction To Database System', level: 1 })).toBeVisible()
  await expect(page.getByText(/Official CWIT R23 curriculum/).first()).toBeVisible()

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Simplify/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Visualise/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Practise/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Revise/ })).toBeEnabled()
})
