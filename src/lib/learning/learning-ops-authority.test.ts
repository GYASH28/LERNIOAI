import { describe, expect, it } from 'vitest'
import { createAuthorityContext, type AuthorityContext } from '@/lib/authority'
import { permissionsForRole, type Role } from '@/lib/roles'
import {
  canPreviewLearningOps,
  learningOpsScopeSummary,
  matchesLearningOpsReportScope,
  type LearningOpsReportScope,
} from './learning-ops-authority'

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

describe('learning operations authority', () => {
  it('allows admins to preview the full learning operations surface', () => {
    expect(canPreviewLearningOps(authority('admin'))).toBe(true)
  })

  it('requires scoped authority for non-admin learning operations preview', () => {
    expect(canPreviewLearningOps(authority('reviewer'))).toBe(false)
    expect(canPreviewLearningOps(authority('reviewer', { subjectIds: ['subject-1'] }))).toBe(true)
    expect(canPreviewLearningOps(authority('teacher', { subjectIds: ['subject-1'] }))).toBe(true)
    expect(canPreviewLearningOps(authority('student', { subjectIds: ['subject-1'] }))).toBe(false)
  })

  it('matches report rows by subject, programme or department code', () => {
    const scope: LearningOpsReportScope = {
      all: false,
      subjectCodes: ['R23CP1401'],
      programmeCodes: ['DCOMP'],
      departmentCodes: ['COMP'],
    }

    expect(matchesLearningOpsReportScope(scope, { subjectCode: 'r23cp1401' })).toBe(true)
    expect(matchesLearningOpsReportScope(scope, { officialSubjectCodes: ['R23CI1601', 'R23CP1401'] })).toBe(true)
    expect(matchesLearningOpsReportScope(scope, { programmeCode: 'DCOMP' })).toBe(true)
    expect(matchesLearningOpsReportScope(scope, { departmentCode: 'COMP' })).toBe(true)
    expect(matchesLearningOpsReportScope(scope, { subjectCode: 'R23CI1601', departmentCode: 'CIOT' })).toBe(false)
  })

  it('summarizes scoped report access without exposing raw ids', () => {
    expect(
      learningOpsScopeSummary({
        all: false,
        subjectCodes: ['R23CP1401', 'R23CP1703'],
        programmeCodes: ['DCOMP'],
        departmentCodes: ['COMP'],
      }),
    ).toBe('Scoped learning operations preview: 2 subjects, 1 programme, 1 department.')
  })
})
