import { expect, test, type WorkerInfo } from '@playwright/test'
import axe from 'axe-core'
import {
  addE2eSession,
  removeE2eUser,
  upsertE2eUser,
  type E2eUser,
} from './helpers/auth'

const PUBLIC_ROUTES = ['/', '/sign-in', '/sign-up', '/forgot-password', '/support'] as const
const STUDENT_ROUTES = [
  '/dashboard',
  '/learn',
  '/materials',
  '/practice',
  '/revision',
  '/notebook',
  '/planner',
  '/tutor',
  '/analytics',
  '/profile',
  '/settings',
] as const

interface AxeViolation {
  id: string
  impact: string | null
  help: string
  nodes: Array<{ target: string[]; failureSummary?: string }>
}

let e2eUser: E2eUser | null = null

test.describe.configure({ timeout: 60_000 })

test.beforeAll(async ({}, workerInfo: WorkerInfo) => {
  e2eUser = await upsertE2eUser(workerInfo, 'accessibility')
})

test.afterAll(async () => {
  await removeE2eUser(e2eUser)
})

test.beforeEach(async ({ context }) => {
  await addE2eSession(context, e2eUser)
})

for (const route of [...PUBLIC_ROUTES, ...STUDENT_ROUTES]) {
  test(`${route} has no serious automated WCAG 2.2 A/AA violations`, async ({ page }) => {
    await page.goto(route, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('body')).toBeVisible()
    if (STUDENT_ROUTES.includes(route as (typeof STUDENT_ROUTES)[number])) {
      await expect(page).not.toHaveURL(/\/sign-in(?:\?|$)/)
    }

    await page.addScriptTag({ content: axe.source })
    const violations = await page.evaluate(async () => {
      const axeRunner = (window as unknown as {
        axe: {
          run: (context: Document, options: unknown) => Promise<{ violations: AxeViolation[] }>
        }
      }).axe
      const results = await axeRunner.run(document, {
        runOnly: {
          type: 'tag',
          values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22a', 'wcag22aa'],
        },
        resultTypes: ['violations'],
      })
      return results.violations
    })

    const blocking = violations.filter((violation) =>
      violation.impact === 'critical' || violation.impact === 'serious',
    )
    expect(blocking, formatViolations(route, blocking)).toEqual([])
  })
}

test('student navigation exposes a keyboard-visible skip link and main landmark', async ({ page }) => {
  await page.goto('/dashboard')
  await page.keyboard.press('Tab')
  const focused = page.locator(':focus')
  await expect(focused).toHaveText(/skip to (main )?content/i)
  await expect(page.locator('main').first()).toBeVisible()
})

function formatViolations(route: string, violations: AxeViolation[]) {
  if (!violations.length) return ''
  return [
    `Accessibility violations on ${route}:`,
    ...violations.flatMap((violation) => [
      `- ${violation.id} (${violation.impact}): ${violation.help}`,
      ...violation.nodes.slice(0, 4).map((node) =>
        `  ${node.target.join(' ')} — ${node.failureSummary || 'No failure summary'}`,
      ),
    ]),
  ].join('\n')
}
