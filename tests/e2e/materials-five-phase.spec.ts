import { expect, test, type Page, type WorkerInfo } from '@playwright/test'
import {
  addE2eSession,
  removeE2eUser,
  upsertE2eUser,
  type E2eUser,
} from './helpers/auth'

// This is an official CWIT R23 unit route. Do not use a legacy detailed-pack
// slug here: the Materials reader deliberately resolves its student-facing
// lessons from the official unit table.
const lessonUrl = '/materials/lesson/R23CP1701/unit-1-algebra'
let e2eUser: E2eUser | null = null

// The first lesson render compiles several rich note sections in development.
// Keep the assertions strict while allowing cold CI and mobile projects enough
// time to exercise all five phases in one test.
test.describe.configure({ timeout: 90_000 })

test.beforeAll(async ({}, workerInfo: WorkerInfo) => {
  e2eUser = await upsertE2eUser(workerInfo, 'materials')
})

test.afterAll(async () => {
  await removeE2eUser(e2eUser)
})

test.beforeEach(async ({ context }) => {
  await addE2eSession(context, e2eUser)
})

async function openProtectedLesson(page: Page, url: string) {
  await page.goto(url)
  if (new URL(page.url()).pathname.startsWith('/sign-in')) {
    throw new Error('The protected Materials route rejected the signed E2E student session.')
  }
}

test('Materials exposes five useful phases from an official CWIT lesson', async ({ page }) => {
  await openProtectedLesson(page, lessonUrl)

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath).toBeVisible()
  await expect(learningPath.getByRole('button')).toHaveCount(5)
  await expect(page.getByRole('heading', { name: 'Algebra', exact: true })).toBeVisible()
  await expect(page.getByText(/Official CWIT R23 curriculum/).first()).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Learn', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Theory' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Simplify/ }).click()
  await expect(page.getByRole('heading', { name: 'Simplify', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Common Mistakes' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Visualise/ }).click()
  await expect(page.getByRole('heading', { name: 'Visualise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Tables' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Practise/ }).click()
  await expect(page.getByRole('heading', { name: 'Practise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Quiz' })).toBeVisible()

  await learningPath.getByRole('button', { name: /Revise/ }).click()
  await expect(page.getByRole('heading', { name: 'Revise', exact: true })).toBeVisible()
  await expect(page.getByRole('heading', { name: /Summary|Formulas|Flashcards/ }).first()).toBeVisible()
})

test('Materials keeps the official five-phase controls usable on a 390px screen', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 })
  await openProtectedLesson(page, lessonUrl)

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath).toBeVisible()
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('Materials gives every phase a purpose while keeping the official CWIT scope visible', async ({ page }) => {
  await openProtectedLesson(page, '/materials/lesson/R23CI2607/unit-1-introduction-to-database-system')

  await expect(page.getByRole('heading', { name: 'Introduction To Database System', level: 1 })).toBeVisible()
  await expect(page.getByText(/Official CWIT R23 curriculum/).first()).toBeVisible()

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Simplify/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Visualise/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Practise/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Revise/ })).toBeEnabled()

  await learningPath.getByRole('button', { name: /Visualise/ }).click()
  await expect(page.getByText('Official CWIT curriculum alignment')).toBeVisible()
  await expect(page.getByText('CO1').first()).toBeVisible()
})
