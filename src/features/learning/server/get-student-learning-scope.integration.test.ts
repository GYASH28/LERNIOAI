import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../../lib/db'
import { getStudentLearningScope, hasResolvedLearningScope } from './get-student-learning-scope'

const FIXTURE_INSTITUTION_CODE = 'CWIT_SCOPE_TEST'
const STUDENT_EMAIL = 'scope-student@tests.lernio.local'
const ADMIN_EMAIL = 'scope-admin@tests.lernio.local'

let institutionId = ''
let departmentId = ''
let programmeId = ''
let schemeId = ''
let semesterId = ''

async function cleanupFixtures() {
  await db.user.deleteMany({ where: { email: { in: [STUDENT_EMAIL, ADMIN_EMAIL] } } })

  if (schemeId) {
    await db.subject.deleteMany({ where: { schemeId } })
    await db.semester.deleteMany({ where: { schemeId } })
    await db.academicScheme.deleteMany({ where: { id: schemeId } })
  } else {
    const fixtureInstitution = await db.institution.findUnique({
      where: { code: FIXTURE_INSTITUTION_CODE },
      select: { id: true },
    })
    if (fixtureInstitution) {
      const schemes = await db.academicScheme.findMany({
        where: { institutionId: fixtureInstitution.id },
        select: { id: true },
      })
      const schemeIds = schemes.map((item) => item.id)
      if (schemeIds.length > 0) {
        await db.subject.deleteMany({ where: { schemeId: { in: schemeIds } } })
        await db.semester.deleteMany({ where: { schemeId: { in: schemeIds } } })
        await db.academicScheme.deleteMany({ where: { id: { in: schemeIds } } })
      }
    }
  }

  if (programmeId) await db.programme.deleteMany({ where: { id: programmeId } })
  if (departmentId) await db.department.deleteMany({ where: { id: departmentId } })
  if (institutionId) {
    await db.institution.deleteMany({ where: { id: institutionId } })
  } else {
    await db.institution.deleteMany({ where: { code: FIXTURE_INSTITUTION_CODE } })
  }
}

describe('getStudentLearningScope integration test', () => {
  beforeAll(async () => {
    await cleanupFixtures()

    const institution = await db.institution.create({
      data: {
        code: FIXTURE_INSTITUTION_CODE,
        name: 'CWIT learning-scope test institution',
        city: 'Pune',
      },
    })
    institutionId = institution.id

    const department = await db.department.create({
      data: {
        institutionId,
        code: 'COMP',
        name: 'Computer Engineering',
        status: 'active',
      },
    })
    departmentId = department.id

    const programme = await db.programme.create({
      data: {
        departmentId,
        code: 'DCOMP',
        name: 'Diploma in Computer Engineering',
        durationSemesters: 6,
        status: 'active',
      },
    })
    programmeId = programme.id

    const scheme = await db.academicScheme.create({
      data: {
        institutionId,
        programmeId,
        code: 'R23-SCOPE-TEST',
        name: 'R23 scope integration fixture',
        startYear: 2023,
        status: 'published',
      },
    })
    schemeId = scheme.id

    const semester = await db.semester.create({
      data: {
        schemeId,
        number: 3,
        name: 'Semester 3',
      },
    })
    semesterId = semester.id

    await db.subject.createMany({
      data: [
        { schemeId, semesterId, code: 'R23CP2402', name: 'Data Structures', status: 'active', reviewStatus: 'structure_verified' },
        { schemeId, semesterId, code: 'R23CP6404', name: 'Object Oriented Programming', status: 'active', reviewStatus: 'structure_verified' },
        { schemeId, semesterId, code: 'R23CP2403', name: 'Microprocessor Programming', status: 'active', reviewStatus: 'structure_verified' },
        { schemeId, semesterId, code: 'R23CP2404', name: 'Data Communication', status: 'active', reviewStatus: 'structure_verified' },
      ],
    })

    await db.user.createMany({
      data: [
        {
          email: STUDENT_EMAIL,
          name: 'Scope Student',
          role: 'student',
          status: 'active',
          provider: 'password',
          profileComplete: true,
          onboarded: true,
          institutionId,
          schemeId,
          departmentCode: 'COMP',
          departmentName: 'Computer Engineering',
          semesterNumber: 3,
          division: 'A',
        },
        {
          email: ADMIN_EMAIL,
          name: 'Scope Admin',
          role: 'admin',
          status: 'active',
          provider: 'password',
          profileComplete: true,
          onboarded: true,
          institutionId,
          schemeId,
          departmentCode: 'COMP',
          departmentName: 'Computer Engineering',
          semesterNumber: 3,
          division: 'A',
        },
      ],
    })
  })

  afterAll(async () => {
    await cleanupFixtures()
  })

  it('resolves correct learning scope for a student fixture', async () => {
    const student = await db.user.findUnique({ where: { email: STUDENT_EMAIL } })

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

    expect(scope.subjects.length).toBe(4)
    const codes = scope.subjects.map((subject) => subject.code)
    expect(codes).toEqual(
      expect.arrayContaining(['R23CP2402', 'R23CP6404', 'R23CP2403', 'R23CP2404']),
    )
  })

  it('resolves scope for an admin fixture and allows previewing drafts', async () => {
    const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })

    expect(admin).not.toBeNull()
    if (!admin) return

    const scope = await getStudentLearningScope(admin.id)

    expect(scope).not.toBeNull()
    if (!scope) return

    expect(hasResolvedLearningScope(scope)).toBe(true)
    expect(scope.canPreviewDrafts).toBe(true)
  })
})
