import { defineConfig, devices } from '@playwright/test'

const crossBrowserSmoke = [
  '**/public-routing.spec.ts',
  '**/a11y.spec.ts',
  '**/cross-browser-smoke.spec.ts',
]

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['line'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: process.env.CI ? 'https://localhost:3443' : 'http://localhost:3000',
    ignoreHTTPSErrors: Boolean(process.env.CI),
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CI
      ? 'npm run build && node scripts/start-ci-https.mjs'
      : 'npx next dev --webpack -p 3000',
    url: process.env.CI ? 'https://localhost:3443' : 'http://localhost:3000',
    ignoreHTTPSErrors: Boolean(process.env.CI),
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    {
      name: 'chromium-full',
      use: { ...devices['Desktop Chrome'] },
    },
    {
      name: 'firefox-smoke',
      testMatch: crossBrowserSmoke,
      use: { ...devices['Desktop Firefox'] },
    },
    {
      name: 'webkit-smoke',
      testMatch: crossBrowserSmoke,
      use: { ...devices['Desktop Safari'] },
    },
    {
      name: 'mobile-chrome-smoke',
      testMatch: crossBrowserSmoke,
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'mobile-safari-smoke',
      testMatch: crossBrowserSmoke,
      use: { ...devices['iPhone 15'] },
    },
  ],
})
