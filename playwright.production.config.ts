import { defineConfig, devices } from '@playwright/test'

// Runs against the output of `next build`, NOT `next dev`.
// Production uses different CSP, script hydration and cookie semantics.
export default defineConfig({
  testDir: './tests/production',
  timeout: 60_000,
  retries: 0,
  expect: { timeout: 12_000 },
  use: {
    baseURL: 'http://127.0.0.1:3001',
    bypassCSP: false,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npx next start -p 3001',
    url: 'http://127.0.0.1:3001/sign-in',
    reuseExistingServer: false,
    timeout: 90_000,
    env: {
      // Simulate a stale host supplied by deployment configuration. The app
      // must use the explicit canonical origin, not this obsolete value.
      NEXTAUTH_URL: 'http://127.0.0.1:3999',
      LERNIO_APP_URL: 'http://127.0.0.1:3001',
      LERNIO_DEMO_MODE: 'false',
    },
  },
  projects: [
    { name: 'production-desktop', use: { ...devices['Desktop Chrome'] } },
    { name: 'production-mobile', use: { ...devices['Pixel 7'] } },
  ],
})
