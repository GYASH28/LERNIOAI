import { describe, expect, it } from 'vitest'
import {
  buildClassGroupKey,
  canUseCapability,
  createAuthorityContext,
  parseAssignedSubjectIds,
  type AuthorityContext,
} from './scope'
import { permissionsForRole, type Role } from '@/lib/roles'

function authority(role: Role, scopeIndex: Partial<AuthorityContext['scopeIndex']> = {}) {
  return createAuthorityContext({
    user: {
      id: `${role}-1`,
      email: `${role}@lernio.test`,
      name: role,
      role,
      status: 'active',
      profileComplete: true,
    },
    capabilities: permissionsForRole(role),
    scopeIndex,
  })
}

describe('authority scope policy', () => {
  it('parses legacy subject assignments conservatively', () => {
    expect(parseAssignedSubjectIds('["sub-a","sub-b","sub-a"]')).toEqual(['sub-a', 'sub-b'])
    expect(parseAssignedSubjectIds('sub-a,sub-b')).toEqual([])
    expect(parseAssignedSubjectIds('{"all":true}')).toEqual([])
    expect(parseAssignedSubjectIds(null)).toEqual([])
  })

  it('allows teacher mutations only for explicitly assigned subjects', () => {
    const teacher = authority('teacher', { subjectIds: ['sub-a'] })

    expect(canUseCapability(teacher, 'lessons.update', { subjectId: 'sub-a' })).toBe(true)
    expect(canUseCapability(teacher, 'lessons.update', { subjectId: 'sub-b' })).toBe(false)
    expect(canUseCapability(teacher, 'lessons.update')).toBe(false)
  })

  it('does not treat null coordinator scope as global department access', () => {
    const coordinator = authority('coordinator')

    expect(canUseCapability(coordinator, 'roles.assign')).toBe(false)
    expect(canUseCapability(coordinator, 'roles.assign', { departmentCode: 'CIOT' })).toBe(false)
  })

  it('allows coordinator actions inside the assigned department only', () => {
    const coordinator = authority('coordinator', { departmentCodes: ['CIOT'] })

    expect(canUseCapability(coordinator, 'roles.assign', { departmentCode: 'CIOT' })).toBe(true)
    expect(canUseCapability(coordinator, 'roles.assign', { departmentCode: 'MECH' })).toBe(false)
  })

  it('keeps reviewer and moderator duties separate', () => {
    const reviewer = authority('reviewer', { subjectIds: ['sub-a'] })
    const moderator = authority('moderator', { institutionIds: ['inst-a'] })

    expect(canUseCapability(reviewer, 'users.update', { departmentCode: 'CIOT' })).toBe(false)
    expect(canUseCapability(moderator, 'lessons.publish', { subjectId: 'sub-a' })).toBe(false)
    expect(canUseCapability(moderator, 'reports.resolve', { institutionId: 'inst-a' })).toBe(true)
  })

  it('allows admins broad authority while final-admin invariants stay in service code', () => {
    const admin = authority('admin')

    expect(canUseCapability(admin, 'roles.assign')).toBe(true)
    expect(canUseCapability(admin, 'system.settings.update')).toBe(true)
  })

  it('honors active admin role assignments even when the primary role is not admin', () => {
    const delegatedAdmin = createAuthorityContext({
      user: {
        id: 'student-admin-1',
        email: 'student-admin@lernio.test',
        name: 'Delegated Admin',
        role: 'student',
        status: 'active',
        profileComplete: true,
      },
      primaryRole: 'student',
      activeRoles: ['student', 'admin'],
      capabilities: [...permissionsForRole('student'), ...permissionsForRole('admin')],
    })

    expect(canUseCapability(delegatedAdmin, 'roles.assign')).toBe(true)
  })

  it('builds class group keys only from complete legacy class scope', () => {
    expect(buildClassGroupKey({ departmentCode: 'ciot', semesterNumber: 2, division: 'a' })).toBe('CIOT:S2:A')
    expect(buildClassGroupKey({ departmentCode: 'ciot', semesterNumber: 2 })).toBeNull()
  })
})
