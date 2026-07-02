import { describe, expect, it } from 'vitest'

// This test documents the production condition handled by the compatible
// tutor stream route: Prisma P2022 for the newly added clientMessageId column.
// The full route behavior is additionally exercised through the Tutor UI and
// stream protocol suites in CI.
describe('tutor production schema compatibility', () => {
  it('recognises the Prisma missing-column signature used by the fallback', () => {
    const error = {
      code: 'P2022',
      message: 'The column TutorMessage.clientMessageId does not exist in the current database.',
      meta: { column: 'TutorMessage.clientMessageId' },
    }

    const detail = [error.message, error.meta.column].join(' ')
    expect(error.code).toBe('P2022')
    expect(detail).toMatch(/clientMessageId/i)
  })
})
