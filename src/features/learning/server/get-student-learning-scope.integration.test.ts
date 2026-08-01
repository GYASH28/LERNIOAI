import { describe, expect, it } from 'vitest'
import { db } from '../../../lib/db'
import { getStudentLearningScope, hasResolvedLearningScope } from './get-student-learning-scope'

/**
 * These tests validate the full, manually seeded CWIT curriculum database.
 * The normal CI database only applies migrations and intentionally contains
 * no application data, so the suite must be enabled explicitly after running
 * the matching seed/import pipeline.
 *
 * Run with:
 *   RUN_SEEDED_INTEGRATION_TESTS=true npm run test -- get-student-learning-scope.integration.test.ts
 */
describe.skipIf(process.env.RUN_SEEDED_INTEGRATION_TESTS !== 'true')(
  'getStudentLearningScope seeded integration test',
  () => {
    it('resolves correct learning scope for seeded student user', async () => {
      const student = await db.user.findFirst({
        where: { email: 'student@lernio.ai' },
      })

      expect(student).not.toBeNull()
      if (!student) return

      const scope = await getStudentLearningScope(student.id)

      expect(scope).not.toBeNull()
      if (!scope) return

      expect(hasResolvedLearningScope(scope)).toBe(true)
      expect(scope.unresolvedReason).toBeNull()
      expect(scope.department?.code).toBe('COMP')
      expect(scope.programme?.code).toBe('DCOMP')
      expect(scope.semester?.number).toBe(3)
      expect(scope.semesterNumber).toBe(3)

      expect(scope.subjects.length).toBeGreaterThanOrEqual(4)
      const codes = scope.subjects.map((subject) => subject.code)
      expect(codes).toContain('R23CP2402')
      expect(codes).toContain('R23CP6404')
      expect(codes).toContain('R23CP2403')
      expect(codes).toContain('R23CP2404')
    })

    it('resolves scope for admin user and allows previewing drafts', async () => {
      const admin = await db.user.findFirst({
        where: { email: 'ultimatebracegaming@gmail.com' },
      })

      expect(admin).not.toBeNull()
      if (!admin) return

      const scope = await getStudentLearningScope(admin.id)

      expect(scope).not.toBeNull()
      if (!scope) return

      expect(scope.canPreviewDrafts).toBe(true)
    })
  },
)