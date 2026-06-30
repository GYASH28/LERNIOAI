import { describe, expect, it } from 'vitest'
import { db } from '../../../lib/db'
import { getStudentLearningScope, hasResolvedLearningScope } from './get-student-learning-scope'

describe('getStudentLearningScope integration test', () => {
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

    // Subjects array should contain the seeded COMP Semester 3 subjects:
    // CS201, CS202, CS203, CS204
    expect(scope.subjects.length).toBeGreaterThanOrEqual(4)
    const codes = scope.subjects.map((s) => s.code)
    expect(codes).toContain('CS201')
    expect(codes).toContain('CS202')
    expect(codes).toContain('CS203')
    expect(codes).toContain('CS204')
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

    // Admin should have preview mode enabled
    expect(scope.canPreviewDrafts).toBe(true)
  })
})
