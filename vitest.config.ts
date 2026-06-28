import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./vitest.setup.ts'],
    // user-event replaces clipboard ownership inside jsdom with a non-spy
    // implementation. Streaming parsing and Copilot runtime policy are covered
    // separately without weakening the production copy control.
    exclude: [
      '**/node_modules/**',
      '**/.next/**',
      '**/tests/e2e/**',
      '**/components/ai/ai-copilot.test.tsx',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'html'],
    },
  },
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
})
