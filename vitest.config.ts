import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // Audit fix #32 (CVSS 2.5): removed the silent exclusion of
    // `**/components/ai/ai-copilot.test.tsx`. The test file exists in the
    // repo but was being skipped in CI — a coverage hole. If the test fails,
    // either fix it or delete it; do not leave dead test files in the repo.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html', 'lcov'],
      // Audit fix #28 (CVSS 5.3): added coverage thresholds.
      // Currently 95.5% of API routes have zero tests, so we start with
      // low thresholds and ratchet them up as coverage improves.
      thresholds: {
        lines: 30,
        functions: 30,
        statements: 30,
        branches: 20,
        perFile: false,
      },
      exclude: [
        'node_modules/**',
        '.next/**',
        'out/**',
        'build/**',
        'src/types/**',
        '**/*.d.ts',
        'vitest.config.ts',
        'vitest.setup.ts',
        'playwright.config.ts',
        'next.config.ts',
        'tailwind.config.ts',
        'postcss.config.mjs',
        'eslint.config.mjs',
      ],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
})
