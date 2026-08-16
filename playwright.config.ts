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
    // Use localhost rather than 127.0.0.1 so standards-compliant browsers can
    // exercise production __Secure-* auth cookies in their localhost exception.
    baseURL: 'http://localhost:3000',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  webServer: {
    command: process.env.CI ? 'npm run build && npm start' : 'npx next dev --webpack -p 3000',
    url: 'http://localhost:3000',
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
