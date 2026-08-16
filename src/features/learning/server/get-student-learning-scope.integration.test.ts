import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import { db } from '../../../lib/db'
import { getStudentLearningScope, hasResolvedLearningScope } from './get-student-learning-scope'

const TEST_INSTITUTION_CODE = 'CWIT-SCOPE-TEST'
const TEST_SCHEME_CODE = 'R23-SCOPE-TEST'
const STUDENT_EMAIL = 'scope-student@tests.lernio.local'
const ADMIN_EMAIL = 'scope-admin@tests.lernio.local'
const PUBLISHED_SUBJECT_CODES = ['R23CP2402', 'R23CP6404', 'R23CP2403', 'R23CP2404'] as const
const DRAFT_SUBJECT_CODE = 'R23CP-DRAFT-TEST'

async function cleanupFixtures() {
  await db.user.deleteMany({ where: { email: { in: [STUDENT_EMAIL, ADMIN_EMAIL] } } })

  const institution = await db.institution.findUnique({
    where: { code: TEST_INSTITUTION_CODE },
    select: { id: true },
  })
  if (!institution) return

  const department = await db.department.findFirst({
    where: { institutionId: institution.id, code: 'COMP' },
    select: { id: true },
  })
  const programme = department
    ? await db.programme.findFirst({
        where: { departmentId: department.id, code: 'DCOMP' },
        select: { id: true },
      })
    : null
  const scheme = programme
    ? await db.academicScheme.findFirst({
        where: {
          institutionId: institution.id,
          programmeId: programme.id,
          code: TEST_SCHEME_CODE,
        },
        select: { id: true },
      })
    : null

  if (scheme) {
    await db.subject.deleteMany({ where: { schemeId: scheme.id } })
    await db.semester.deleteMany({ where: { schemeId: scheme.id } })
    await db.academicScheme.delete({ where: { id: scheme.id } })
  }
  if (programme) await db.programme.delete({ where: { id: programme.id } })
  if (department) await db.department.delete({ where: { id: department.id } })
  await db.institution.delete({ where: { id: institution.id } })
}

beforeAll(async () => {
  await cleanupFixtures()

  const institution = await db.institution.create({
    data: {
      code: TEST_INSTITUTION_CODE,
      name: 'CWIT Learning Scope Test',
      city: 'Pune',
    },
  })
  const department = await db.department.create({
    data: {
      institutionId: institution.id,
      code: 'COMP',
      name: 'Computer Engineering',
      status: 'active',
    },
  })
  const programme = await db.programme.create({
    data: {
      departmentId: department.id,
      code: 'DCOMP',
      name: 'Diploma in Computer Engineering',
      durationSemesters: 6,
      status: 'active',
    },
  })
  const scheme = await db.academicScheme.create({
    data: {
      institutionId: institution.id,
      programmeId: programme.id,
      code: TEST_SCHEME_CODE,
      name: 'R23 test scheme',
      startYear: 2023,
      status: 'published',
    },
  })
  const semester = await db.semester.create({
    data: {
      schemeId: scheme.id,
      number: 3,
      name: 'Semester 3',
    },
  })

  await db.subject.createMany({
    data: [
      ...PUBLISHED_SUBJECT_CODES.map((code, index) => ({
        schemeId: scheme.id,
        semesterId: semester.id,
        code,
        name: `Published subject ${index + 1}`,
        shortName: `S${index + 1}`,
        displayOrder: index + 1,
        status: 'active',
        reviewStatus: 'structure_verified',
        publishedAt: new Date(),
      })),
      {
        schemeId: scheme.id,
        semesterId: semester.id,
        code: DRAFT_SUBJECT_CODE,
        name: 'Draft subject that students must not see',
        shortName: 'DRAFT',
        displayOrder: 99,
        status: 'draft',
        reviewStatus: 'draft',
        publishedAt: null,
      },
    ],
  })

  await db.user.createMany({
    data: [
      {
        email: STUDENT_EMAIL,
        name: 'Scope Student',
        role: 'student',
        institutionId: institution.id,
        schemeId: scheme.id,
        departmentCode: 'COMP',
        semesterNumber: 3,
        onboarded: true,
        profileComplete: true,
      },
      {
        email: ADMIN_EMAIL,
        name: 'Scope Admin',
        role: 'admin',
        institutionId: institution.id,
        schemeId: scheme.id,
        departmentCode: 'COMP',
        semesterNumber: 3,
        onboarded: true,
        profileComplete: true,
      },
    ],
  })
})

afterAll(async () => {
  await cleanupFixtures()
})

describe('getStudentLearningScope integration test', () => {
  it('resolves the student scope and excludes draft subjects', async () => {
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
    expect(scope.canPreviewDrafts).toBe(false)

    const codes = scope.subjects.map((subject) => subject.code)
    expect(codes).toEqual(PUBLISHED_SUBJECT_CODES)
    expect(codes).not.toContain(DRAFT_SUBJECT_CODE)
  })

  it('allows an admin to preview draft subjects in the same scope', async () => {
    const admin = await db.user.findUnique({ where: { email: ADMIN_EMAIL } })
    expect(admin).not.toBeNull()
    if (!admin) return

    const scope = await getStudentLearningScope(admin.id)

    expect(scope).not.toBeNull()
    if (!scope) return

    expect(hasResolvedLearningScope(scope)).toBe(true)
    expect(scope.canPreviewDrafts).toBe(true)
    expect(scope.subjects.map((subject) => subject.code)).toContain(DRAFT_SUBJECT_CODE)
  })
})
