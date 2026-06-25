import { expect, test, type Page } from '@playwright/test'

const FULL_PAGE_SNAPSHOTS = [
  { name: 'marketing-home-mobile-390.png', width: 390, height: 844 },
  { name: 'marketing-home-1100.png', width: 1100, height: 736 },
  { name: 'marketing-home-1180.png', width: 1180, height: 768 },
  { name: 'marketing-home-1366.png', width: 1366, height: 736 },
  { name: 'marketing-home-1440.png', width: 1440, height: 900 },
] as const

const SECTION_SNAPSHOTS = [
  { name: 'hero-desktop.png', selector: 'section[aria-labelledby="hero-heading"]' },
  { name: 'how-it-works-desktop.png', selector: '#how-it-works' },
  { name: 'learning-modes-desktop.png', selector: '#subjects' },
  { name: 'tutor-desktop.png', selector: '#ai-tutor' },
  { name: 'exam-flow-desktop.png', selector: '#exam-revision' },
  { name: 'labs-desktop.png', selector: '#labs' },
  { name: 'campus-desktop.png', selector: '#campus' },
  { name: 'trust-desktop.png', selector: 'section[aria-labelledby="trust-heading"]' },
  { name: 'footer-desktop.png', selector: 'footer' },
] as const

async function openVisualHome(page: Page, width: number, height: number) {
  await page.setViewportSize({ width, height })
  await page.goto('/', { waitUntil: 'domcontentloaded' })
  await page.addStyleTag({
    content: `
      *, *::before, *::after {
        animation-duration: 0.001ms !important;
        animation-delay: 0s !important;
        transition-duration: 0.001ms !important;
        scroll-behavior: auto !important;
      }
      .theme-atmosphere {
        display: none !important;
      }
    `,
  })
  await page.evaluate(() => {
    document.documentElement.setAttribute('data-palette', 'aurora')
    document.documentElement.setAttribute('data-appearance', 'light')
    document.documentElement.setAttribute('data-motion', 'none')
    document.documentElement.setAttribute('data-density', 'comfortable')
  })
  await expect(page.locator('body')).toBeVisible()
  await page.waitForLoadState('networkidle')
}

test.describe('marketing reference visual baselines', () => {
  test.beforeEach(({}, testInfo) => {
    test.skip(
      testInfo.project.name !== 'chromium',
      'Reference screenshots are captured once in Chromium.',
    )
  })

  for (const shot of FULL_PAGE_SNAPSHOTS) {
    test(`captures ${shot.name}`, async ({ page }) => {
      await openVisualHome(page, shot.width, shot.height)
      await expect(page).toHaveScreenshot(shot.name, {
        fullPage: true,
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }

  for (const shot of SECTION_SNAPSHOTS) {
    test(`captures ${shot.name}`, async ({ page }) => {
      await openVisualHome(page, 1366, 900)
      await expect(page.locator(shot.selector)).toHaveScreenshot(shot.name, {
        animations: 'disabled',
        caret: 'hide',
        maxDiffPixelRatio: 0.02,
      })
    })
  }

  for (const tab of ['Learn', 'Practice', 'AI Tutor', 'Revision']) {
    test(`captures product preview ${tab}`, async ({ page }) => {
      await openVisualHome(page, 1100, 736)
      const preview = page.locator('[data-marketing-product-preview]')
      await preview.getByRole('tab', { name: tab }).click()
      await expect(preview).toHaveScreenshot(
        `product-preview-${tab.toLowerCase().replaceAll(' ', '-')}.png`,
        {
          animations: 'disabled',
          caret: 'hide',
          maxDiffPixelRatio: 0.02,
        },
      )
    })
  }
})
