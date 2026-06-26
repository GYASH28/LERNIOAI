import { describe, expect, it } from 'vitest'
import { getCampusDashboardPath, getProgrammeByDepartmentCode, validateRollNumber } from './campus-auth'

describe('campus auth helpers', () => {
  it('does not silently default invalid department codes', () => {
    expect(getProgrammeByDepartmentCode('CIOT')).toMatchObject({ departmentCode: 'CIOT' })
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
