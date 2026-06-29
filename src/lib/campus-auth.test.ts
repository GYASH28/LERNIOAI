import { describe, expect, it } from 'vitest'
import { CWIT_PROGRAMMES, getCampusDashboardPath, getProgrammeByDepartmentCode, validateRollNumber } from './campus-auth'

describe('campus auth helpers', () => {
  it('exposes only the two Lernio target programmes to student selectors', () => {
    expect(CWIT_PROGRAMMES.map((programme) => programme.programmeCode)).toEqual(['DCOMP', 'DCIOT'])
    expect(CWIT_PROGRAMMES.map((programme) => programme.departmentCode)).toEqual(['COMP', 'CIOT'])
  })

  it('does not silently default invalid department codes', () => {
    expect(getProgrammeByDepartmentCode('CIOT')).toMatchObject({ departmentCode: 'CIOT' })
    expect(getProgrammeByDepartmentCode('CIVIL')).toBeNull()
    expect(getProgrammeByDepartmentCode('SH')).toBeNull()
    expect(getProgrammeByDepartmentCode('NOT_A_REAL_DEPT')).toBeNull()
  })

  it('allows roll number to be omitted at signup', () => {
    expect(validateRollNumber('')).toBe(true)
    expect(validateRollNumber('254101')).toBe(true)
    expect(validateRollNumber('FY-24/101')).toBe(true)
    expect(validateRollNumber('roll number with spaces')).toBe(false)
  })

  it('routes elevated roles to their authority workspaces', () => {
    expect(getCampusDashboardPath('student')).toBe('/dashboard')
    expect(getCampusDashboardPath('cr')).toBe('/cr')
    expect(getCampusDashboardPath('teacher')).toBe('/teacher')
    expect(getCampusDashboardPath('coordinator')).toBe('/coordinator')
    expect(getCampusDashboardPath('moderator')).toBe('/moderator')
    expect(getCampusDashboardPath('reviewer')).toBe('/reviewer')
    expect(getCampusDashboardPath('admin')).toBe('/admin')
  })
})
