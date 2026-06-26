import { describe, expect, it } from 'vitest'
import { canAssignRole, hasPermission, isElevatedRole, normalizeRole } from './roles'

describe('canonical roles and permissions', () => {
  it('normalizes unknown roles to student', () => {
    expect(normalizeRole('ADMIN')).toBe('admin')
    expect(normalizeRole('owner')).toBe('student')
  })

  it('keeps elevated roles distinct from ordinary students', () => {
    expect(isElevatedRole('student')).toBe(false)
    expect(isElevatedRole('teacher')).toBe(true)
    expect(hasPermission('admin', 'roles.assign')).toBe(true)
    expect(hasPermission('admin', 'role.assign')).toBe(true)
    expect(hasPermission('student', 'roles.assign')).toBe(false)
  })

  it('prevents non-admins from assigning administrator access', () => {
    expect(canAssignRole('admin', 'teacher')).toBe(true)
    expect(canAssignRole('admin', 'admin')).toBe(false)
    expect(canAssignRole('student', 'teacher')).toBe(false)
  })
})
