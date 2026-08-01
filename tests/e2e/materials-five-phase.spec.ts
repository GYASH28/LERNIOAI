import { expect, test, type BrowserContext, type Page, type WorkerInfo } from '@playwright/test'
import { hash } from 'bcryptjs'
import { encode } from 'next-auth/jwt'
import { db } from '../../src/lib/db'
import { normalizeRole } from '../../src/lib/roles'

const lessonUrl = '/materials/lesson/R23CP1701/logarithms-and-progressions'
const e2ePassword = 'Lernio-e2e-only-2026'
let e2eEmail = ''

// The first lesson render compiles several rich note sections in development.
// Keep the assertions strict while allowing cold CI and mobile projects enough
// time to exercise all five phases in one test.
test.describe.configure({ timeout: 90_000 })

test.beforeAll(async ({}, workerInfo: WorkerInfo) => {
  // Local demo runs do not need a database-backed login. CI deliberately runs
  // with demo mode disabled, so create a disposable real user there.
  if (!process.env.DATABASE_URL) return
  e2eEmail = `materials-${workerInfo.project.name.replace(/[^a-z0-9]/gi, '-')}@e2e.lernio.local`
  await db.user.upsert({
    where: { email: e2eEmail },
    create: {
      email: e2eEmail,
      emailVerified: new Date(),
      name: 'Materials E2E Student',
      passwordHash: await hash(e2ePassword, 4),
      role: 'student',
      status: 'active',
      provider: 'password',
      profileComplete: true,
      onboarded: true,
    },
    update: {
      passwordHash: await hash(e2ePassword, 4),
      status: 'active',
      profileComplete: true,
    },
  })
})

test.afterAll(async () => {
  if (e2eEmail) await db.user.deleteMany({ where: { email: e2eEmail } })
})

test.beforeEach(async ({ context }) => {
  if (!e2eEmail) return
  const user = await db.user.findUniqueOrThrow({ where: { email: e2eEmail } })
  const token = await encode({
    secret: process.env.NEXTAUTH_SECRET || 'ci-secret-replace-in-production',
    maxAge: 60 * 60,
    token: {
      id: user.id,
      sub: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      status: user.status,
      profileComplete: user.profileComplete,
      authorityVersion: user.authorityVersion,
      authIssuedAt: Date.now(),
      sessionRevoked: false,
    },
  })
  await addSessionCookie(context, token)
})

async function addSessionCookie(context: BrowserContext, token: string) {
  await context.addCookies([{
    name: 'next-auth.session-token',
    value: token,
    url: 'http://127.0.0.1:3000',
    httpOnly: true,
    sameSite: 'Lax',
  }])
}

async function openProtectedLesson(page: Page, url: string) {
  await page.goto(url)
  if (new URL(page.url()).pathname.startsWith('/sign-in')) {
    throw new Error('The protected Materials route rejected the signed E2E student session.')
  }
}

test('Materials exposes five distinct lesson phases from one canonical note', async ({ page }) => {
  await openProtectedLesson(page, lessonUrl)

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
  await openProtectedLesson(page, lessonUrl)

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath).toBeVisible()
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeVisible()

  const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth)
  expect(overflow).toBeLessThanOrEqual(1)
})

test('Materials serves exact official CWIT scope without inventing unsupported phases', async ({ page }) => {
  await openProtectedLesson(page, '/materials/lesson/R23CI2607/unit-1-introduction-to-database-system')

  await expect(page.getByRole('heading', { name: 'Introduction To Database System', level: 1 })).toBeVisible()
  await expect(page.getByText(/Official CWIT R23 curriculum/).first()).toBeVisible()

  const learningPath = page.getByRole('navigation', { name: 'Five learning phases' })
  await expect(learningPath.getByRole('button', { name: /Learn/ })).toBeEnabled()
  await expect(learningPath.getByRole('button', { name: /Simplify/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Visualise/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Practise/ })).toBeDisabled()
  await expect(learningPath.getByRole('button', { name: /Revise/ })).toBeEnabled()
})
