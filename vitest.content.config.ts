import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  test: {
    environment: 'node',
    globals: true,
    include: [
      'src/lib/curriculum/lesson-video-complete-coverage.test.ts',
      'src/lib/curriculum/lesson-video-research-queue.test.ts',
      'src/lib/curriculum/lesson-notes-loader.test.ts',
      'src/lib/curriculum/materials-learning-phases.test.ts',
      'src/lib/curriculum/official-course-content.test.ts',
      'src/lib/curriculum/official-course-extraction.test.ts',
      'src/lib/resources/missing-lesson-video-research.test.ts',
      'src/lib/resources/official-lesson-video-review.test.ts',
    ],
  },
  resolve: {
    alias: {
      'server-only': fileURLToPath(new URL('./tests/stubs/server-only.ts', import.meta.url)),
    },
  },
})
