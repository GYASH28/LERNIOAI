import { expect, test, type Page } from '@playwright/test'

const HOME_WIDTHS = [
  320, 360, 375, 390, 430, 540, 640, 768, 820, 912, 1024, 1100, 1180, 1280,
  1366, 1440, 1536, 1920,
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
const REFERENCE_DESKTOP_WIDTHS = [1100, 1180, 1366, 1440] as const

async function openStable(page: Page, route: string) {
  await page.goto(route, { waitUntil: 'domcontentloaded' })
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
    const clippedValues = ['hidden', 'clip']

    const isVisible = (element: Element, rect: DOMRect) => {
      const style = window.getComputedStyle(element)
      return (
        rect.width > 0 &&
        rect.height > 0 &&
        style.visibility !== 'hidden' &&
        style.display !== 'none'
      )
    }

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

    const isClippedByAncestor = (element: Element, rect: DOMRect) => {
      let current = element.parentElement
      while (current && current !== document.body) {
        const style = window.getComputedStyle(current)
        const clipsX =
          clippedValues.includes(style.overflowX) ||
          clippedValues.includes(style.overflow)
        if (clipsX) {
          const ancestorRect = current.getBoundingClientRect()
          const clippedLeft = rect.left < ancestorRect.left - tolerance
          const clippedRight = rect.right > ancestorRect.right + tolerance
          if (clippedLeft || clippedRight) return true
        }
        current = current.parentElement
      }
      return false
    }

    const offenders = Array.from(document.body.querySelectorAll('*'))
      .map((element) => {
        const rect = element.getBoundingClientRect()
        if (!isVisible(element, rect)) return null
        if (hasScrollableAncestor(element) || isClippedByAncestor(element, rect)) {
          return null
        }
        const overflowRight = rect.right - viewportWidth
        const overflowLeft = -rect.left
        if (overflowRight <= tolerance && overflowLeft <= tolerance) return null
        const computed = window.getComputedStyle(element)
        const section = element.closest('header, main, section, footer')
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
          overflowX: computed.overflowX,
          section:
            section?.id ||
            section?.getAttribute('aria-labelledby') ||
            section?.tagName.toLowerCase() ||
            null,
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
  expect(
    report.offenders,
    `Visible overflow offenders: ${JSON.stringify(report, null, 2)}`,
  ).toEqual([])
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

async function expectReferenceDesktopLayout(page: Page) {
  const layout = await page.evaluate(() => {
    const rectOf = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return null
      const rect = element.getBoundingClientRect()
      return {
        left: rect.left,
        right: rect.right,
        top: rect.top,
        bottom: rect.bottom,
        width: rect.width,
        height: rect.height,
      }
    }

    const childRects = (selector: string) => {
      const element = document.querySelector(selector)
      if (!element) return []
      return Array.from(element.children).map((child) => {
        const rect = child.getBoundingClientRect()
        return {
          left: rect.left,
          right: rect.right,
          top: rect.top,
          bottom: rect.bottom,
          width: rect.width,
          height: rect.height,
        }
      })
    }

    const firstSection = document.querySelector('.marketing-section')
    const firstH2 = document.querySelector('.marketing-h2')
    const firstEyebrow = document.querySelector('.marketing-eyebrow')
    const sectionStyle = firstSection ? window.getComputedStyle(firstSection) : null
    const h2Style = firstH2 ? window.getComputedStyle(firstH2) : null
    const eyebrowStyle = firstEyebrow ? window.getComputedStyle(firstEyebrow) : null

    return {
      viewportWidth: document.documentElement.clientWidth,
      container: rectOf('[data-marketing-container="hero"]'),
      heroCopy: rectOf('[data-marketing-hero-copy]'),
      heroPreview: rectOf('[data-marketing-hero-preview]'),
      rows: {
        how: childRects('[data-marketing-grid="how"]'),
        exam: childRects('[data-marketing-grid="exam"]'),
        labs: childRects('[data-marketing-grid="labs"]'),
        trust: childRects('[data-marketing-grid="trust"]'),
      },
      twoColumns: {
        tutor: childRects('[data-marketing-two-column="tutor"]'),
        campus: childRects('[data-marketing-two-column="campus"]'),
      },
      footerItems: childRects('[data-marketing-footer-grid]'),
      typography: {
        h2: h2Style ? Number.parseFloat(h2Style.fontSize) : 0,
        eyebrow: eyebrowStyle ? Number.parseFloat(eyebrowStyle.fontSize) : 0,
        sectionPaddingTop: sectionStyle
          ? Number.parseFloat(sectionStyle.paddingTop)
          : 0,
        sectionPaddingBottom: sectionStyle
          ? Number.parseFloat(sectionStyle.paddingBottom)
          : 0,
      },
    }
  })

  expect(layout.container, 'Hero container was not found').not.toBeNull()
  expect(layout.heroCopy, 'Hero copy was not found').not.toBeNull()
  expect(layout.heroPreview, 'Hero preview was not found').not.toBeNull()

  const container = layout.container!
  expect(container.left).toBeGreaterThanOrEqual(24)
  expect(layout.viewportWidth - container.right).toBeGreaterThanOrEqual(24)
  expect(Math.abs(container.left - (layout.viewportWidth - container.right))).toBeLessThanOrEqual(3)
  expect(container.width).toBeLessThanOrEqual(1154)

  const heroCopy = layout.heroCopy!
  const heroPreview = layout.heroPreview!
  expect(heroPreview.left).toBeGreaterThan(heroCopy.right)
  expect(Math.max(heroCopy.top, heroPreview.top)).toBeLessThan(
    Math.min(heroCopy.bottom, heroPreview.bottom),
  )
  expect(Math.abs(heroPreview.top - heroCopy.top)).toBeLessThanOrEqual(80)

  for (const [name, row] of Object.entries({
    how: layout.rows.how,
    exam: layout.rows.exam,
    labs: layout.rows.labs,
  })) {
    expect(row, `${name} row should have four cards`).toHaveLength(4)
    const tops = row.map((item) => Math.round(item.top))
    const widths = row.map((item) => item.width)
    expect(Math.max(...tops) - Math.min(...tops), `${name} cards should share a row`).toBeLessThanOrEqual(3)
    expect(Math.max(...widths) - Math.min(...widths), `${name} card widths should match`).toBeLessThanOrEqual(6)
  }

  expect(layout.rows.trust, 'Trust grid should have six cards').toHaveLength(6)
  const trustTopRow = layout.rows.trust.slice(0, 3).map((item) => Math.round(item.top))
  const trustSecondRow = layout.rows.trust.slice(3, 6).map((item) => Math.round(item.top))
  expect(Math.max(...trustTopRow) - Math.min(...trustTopRow)).toBeLessThanOrEqual(3)
  expect(Math.max(...trustSecondRow) - Math.min(...trustSecondRow)).toBeLessThanOrEqual(3)

  for (const [name, columns] of Object.entries(layout.twoColumns)) {
    expect(columns, `${name} should have two columns`).toHaveLength(2)
    expect(columns[1].left, `${name} right column should sit after copy`).toBeGreaterThan(columns[0].right)
    expect(Math.max(columns[0].top, columns[1].top), `${name} columns should overlap vertically`).toBeLessThan(
      Math.min(columns[0].bottom, columns[1].bottom),
    )
  }

  expect(layout.footerItems, 'Footer should have four columns').toHaveLength(4)
  const footerTops = layout.footerItems.map((item) => Math.round(item.top))
  expect(Math.max(...footerTops) - Math.min(...footerTops)).toBeLessThanOrEqual(3)

  expect(layout.typography.eyebrow).toBeGreaterThanOrEqual(12)
  expect(layout.typography.h2).toBeGreaterThanOrEqual(38)
  expect(layout.typography.h2).toBeLessThanOrEqual(46)
  expect(layout.typography.sectionPaddingTop).toBeGreaterThanOrEqual(88)
  expect(layout.typography.sectionPaddingBottom).toBeGreaterThanOrEqual(88)
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

  for (const width of REFERENCE_DESKTOP_WIDTHS) {
    test(`home matches reference desktop layout at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openStable(page, '/')
      await expectReferenceDesktopLayout(page)
      await expectNoHorizontalOverflow(page)
    })
  }

  for (const width of [390, 1100] as const) {
    test(`product preview tabs stay contained at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openStable(page, '/')
      const preview = page.locator('[data-marketing-product-preview]')
      for (const tab of ['Learn', 'Practice', 'AI Tutor', 'Revision']) {
        await preview.getByRole('tab', { name: tab }).click()
        await expectNoHorizontalOverflow(page)
        await expectNoClippedInteractiveControls(page)
      }
    })
  }

  for (const width of [390, 1100] as const) {
    test(`FAQ open states stay contained at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 900 })
      await openStable(page, '/')
      await page.locator('#faq').scrollIntoViewIfNeeded()
      const questions = page.locator('#faq button')
      const count = await questions.count()
      for (let index = 0; index < count; index++) {
        await questions.nth(index).click()
        await expectNoHorizontalOverflow(page)
        await expectNoClippedInteractiveControls(page)
      }
    })
  }

  test('mobile menu stays inside the viewport when open', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 })
    await openStable(page, '/')
    await page.getByRole('button', { name: 'Open navigation menu' }).click()
    await expectNoHorizontalOverflow(page)
    await expectNoClippedInteractiveControls(page)
  })

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
