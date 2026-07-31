import { expect, test, type Page } from '@playwright/test'

const HOME_WIDTHS = [
  320, 360, 375, 390, 430, 540, 640, 768, 820, 912, 1024, 1180, 1280, 1366,
  1440, 1536, 1920,
] as const

const CORE_ROUTES = [
  '/',
  '/sign-in',
  '/sign-up',
  '/forgot-password',
  '/reset-password',
  '/privacy',
  '/terms',
  '/support',
  '/dashboard',
] as const

const CORE_WIDTHS = [320, 768, 1024, 1180, 1366] as const

async function openStable(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })

  // Protected routes intentionally redirect anonymous visitors. Wait for the
  // final document before evaluating geometry, otherwise the execution
  // context can disappear while the redirect is completing.
  if (route === '/dashboard') {
    await expect(page).toHaveURL(/\/sign-in\?callbackUrl=%2Fdashboard|\/sign-in\?callbackUrl=\/dashboard/)
  }

  await page.waitForLoadState('networkidle')
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
    `,
  })
  await expect(page.locator('body')).toBeVisible()
}

async function expectNoHorizontalOverflow(page: Page) {
  const report = await page.evaluate(() => {
    const tolerance = 2
    const root = document.documentElement
    const viewportWidth = root.clientWidth
    const isVisible = (element: Element, rect: DOMRect) => {
      const style = window.getComputedStyle(element)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      )
    }

    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        if (!isVisible(element, rect)) return null
        const overflowRight = rect.right - viewportWidth
        const overflowLeft = -rect.left
        if (overflowRight <= tolerance && overflowLeft <= tolerance) return null
        const computed = window.getComputedStyle(element)
        return {
          tag: element.tagName.toLowerCase(),
          id: element.id || null,
          className:
            typeof element.className === 'string'
              ? element.className.slice(0, 140)
              : null,
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            width: Math.round(rect.width),
          },
          overflow: Math.round(Math.max(overflowRight, overflowLeft)),
          position: computed.position,
        }
      })
      .filter(Boolean)
      .slice(0, 8)

    return {
      scrollWidth: root.scrollWidth,
      clientWidth: root.clientWidth,
      offenders,
    }
  })

  expect(report, JSON.stringify(report, null, 2)).toMatchObject({
    scrollWidth: expect.any(Number),
    clientWidth: expect.any(Number),
  })
  expect(
    report.scrollWidth,
    `Horizontal overflow: ${JSON.stringify(report, null, 2)}`,
  ).toBeLessThanOrEqual(report.clientWidth + 2)
}

async function expectNoClippedInteractiveControls(page: Page) {
  const clipped = await page.evaluate(() => {
    const viewportWidth = document.documentElement.clientWidth
    const selector =
      'a, button, input, select, textarea, summary, [role="button"], [role="tab"], [tabindex]:not([tabindex="-1"])'

    const hasScrollableAncestor = (element: Element) => {
      let current = element.parentElement
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current)
        const scrollableX =
          ['auto', 'scroll'].includes(style.overflowX) &&
          current.scrollWidth > current.clientWidth
        if (scrollableX) return true
        current = current.parentElement
      }
      return false
    }

    return Array.from(document.querySelectorAll(selector))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        const style = window.getComputedStyle(element)
        if (
          rect.width === 0 ||
          rect.height === 0 ||
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          hasScrollableAncestor(element)
        ) {
          return null
        }
        const clippedHorizontally = rect.left < -1 || rect.right > viewportWidth + 1
        if (!clippedHorizontally) return null
        return {
          tag: element.tagName.toLowerCase(),
          text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
          rect: {
            left: Math.round(rect.left),
            right: Math.round(rect.right),
            top: Math.round(rect.top),
            bottom: Math.round(rect.bottom),
          },
        }
      })
      .filter(Boolean)
      .slice(0, 8)
  })

  expect(clipped, `Clipped controls: ${JSON.stringify(clipped, null, 2)}`).toEqual([])
}

async function expectHeaderControlsDoNotOverlap(page: Page) {
  const overlaps = await page.evaluate(() => {
    const header = document.querySelector('header')
    if (!header) return []
    const controls = Array.from(header.querySelectorAll('a, button')).filter((element) => {
      const rect = element.getBoundingClientRect()
      const style = window.getComputedStyle(element)
      return rect.width > 0 && rect.height > 0 && style.visibility !== 'hidden'
    })

    const pairs: unknown[] = []
    for (let i = 0; i < controls.length; i++) {
      for (let j = i + 1; j < controls.length; j++) {
        const a = controls[i].getBoundingClientRect()
        const b = controls[j].getBoundingClientRect()
        const intersects =
          a.left < b.right - 1 &&
          a.right > b.left + 1 &&
          a.top < b.bottom - 1 &&
          a.bottom > b.top + 1
        if (intersects) {
          pairs.push({
            first: controls[i].textContent?.trim().replace(/\s+/g, ' '),
            second: controls[j].textContent?.trim().replace(/\s+/g, ' '),
          })
        }
      }
    }
    return pairs
  })

  expect(overlaps, `Header overlaps: ${JSON.stringify(overlaps, null, 2)}`).toEqual([])
}

test.describe('responsive alignment guardrails', () => {
  for (const width of HOME_WIDTHS) {
    test(`home has no page overflow at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openStable(page, '/')
      await expectNoHorizontalOverflow(page)
      await expectNoClippedInteractiveControls(page)
      await expectHeaderControlsDoNotOverlap(page)
    })
  }

  for (const route of CORE_ROUTES) {
    for (const width of CORE_WIDTHS) {
      test(`${route} has aligned controls at ${width}px`, async ({ page }) => {
        await page.setViewportSize({ width, height: 900 })
        await openStable(page, route)
        await expectNoHorizontalOverflow(page)
        await expectNoClippedInteractiveControls(page)
      })
    }
  }

  test('home remains aligned with reduced motion and high contrast', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await page.emulateMedia({ reducedMotion: 'reduce' })
    await openStable(page, '/')
    await page.evaluate(() => {
      document.documentElement.setAttribute('data-contrast', 'high')
      document.documentElement.setAttribute('data-motion', 'reduced')
    })
    await expectNoHorizontalOverflow(page)
    await expectNoClippedInteractiveControls(page)
  })
})