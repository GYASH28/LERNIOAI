import { db } from '../src/lib/db'
import {
  TARGET_CWIT_DEPARTMENT_CODES,
  TARGET_CWIT_PROGRAMME_CODES,
} from '../src/lib/cwit-departments'

type ScopeMode = 'dry-run' | 'write'

function parseMode(argv = process.argv.slice(2)): ScopeMode {
  const write = argv.includes('--write')
  const dryRun = argv.includes('--dry-run') || !write
  if (write && argv.includes('--dry-run')) {
    throw new Error('Use either --dry-run or --write, not both.')
  }
  return dryRun ? 'dry-run' : 'write'
}

async function main() {
  const mode = parseMode()
  const now = new Date()
  const institution = await db.institution.findUnique({
    where: { code: 'CWIT' },
    select: { id: true, code: true, name: true },
  })

  if (!institution) {
    throw new Error('CWIT institution not found. Run npm run db:departments first.')
  }

  const [departments, programmes, users, schemes, classGroups, roleAssignments, authorityGrants] = await Promise.all([
    db.department.findMany({
      where: { institutionId: institution.id },
      orderBy: { code: 'asc' },
      select: { id: true, code: true, name: true, status: true, archivedAt: true },
    }),
    db.programme.findMany({
      where: { department: { institutionId: institution.id } },
      orderBy: [{ department: { code: 'asc' } }, { code: 'asc' }],
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        archivedAt: true,
        department: { select: { code: true, name: true } },
      },
    }),
    db.user.findMany({
      where: { departmentCode: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } },
      select: { id: true, email: true, role: true, departmentCode: true, semesterNumber: true },
      take: 250,
      orderBy: { createdAt: 'asc' },
    }),
    db.academicScheme.findMany({
      where: {
        institutionId: institution.id,
        OR: [
          { programme: { code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } } },
          { programmeId: null },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        archivedAt: true,
        programme: { select: { code: true } },
      },
      orderBy: { code: 'asc' },
    }),
    db.classGroup.findMany({
      where: {
        institutionId: institution.id,
        OR: [
          { department: { code: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } } },
          { programme: { code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } } },
        ],
      },
      select: {
        id: true,
        code: true,
        name: true,
        status: true,
        department: { select: { code: true } },
        programme: { select: { code: true } },
      },
      orderBy: [{ semesterNumber: 'asc' }, { division: 'asc' }, { name: 'asc' }],
    }),
    db.roleAssignment.findMany({
      where: {
        institutionId: institution.id,
        OR: [
          { departmentCode: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } },
          { department: { code: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } } },
          { programme: { code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } } },
        ],
      },
      select: { id: true, role: true, status: true, departmentCode: true, userId: true },
      take: 250,
      orderBy: { createdAt: 'asc' },
    }),
    db.authorityGrant.findMany({
      where: {
        institutionId: institution.id,
        OR: [
          { departmentCode: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } },
          { department: { code: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } } },
          { programme: { code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } } },
        ],
      },
      select: { id: true, role: true, status: true, departmentCode: true, userId: true },
      take: 250,
      orderBy: { createdAt: 'asc' },
    }),
  ])

  const targetDepartmentSet = new Set<string>(TARGET_CWIT_DEPARTMENT_CODES)
  const targetProgrammeSet = new Set<string>(TARGET_CWIT_PROGRAMME_CODES)

  const targetDepartments = departments.filter((department) => targetDepartmentSet.has(department.code))
  const departmentsToArchive = departments.filter((department) => !targetDepartmentSet.has(department.code))
  const targetProgrammes = programmes.filter((programme) => targetProgrammeSet.has(programme.code))
  const programmesToArchive = programmes.filter((programme) => !targetProgrammeSet.has(programme.code))

  const report = {
    mode,
    institution,
    targetDepartments: targetDepartments.map(({ id: _id, ...item }) => item),
    departmentsToArchive: departmentsToArchive.map(({ id: _id, ...item }) => item),
    targetProgrammes: targetProgrammes.map(({ id: _id, ...item }) => item),
    programmesToArchive: programmesToArchive.map(({ id: _id, ...item }) => item),
    affectedCounts: {
      departments: departmentsToArchive.length,
      programmes: programmesToArchive.length,
      sampledUsers: users.length,
      schemes: schemes.length,
      classGroups: classGroups.length,
      sampledRoleAssignments: roleAssignments.length,
      sampledAuthorityGrants: authorityGrants.length,
    },
    users,
    schemes,
    classGroups,
    roleAssignments,
    authorityGrants,
  }

  if (mode === 'dry-run') {
    console.warn(JSON.stringify(report, null, 2))
    return
  }

  await db.$transaction(async (tx) => {
    await tx.department.updateMany({
      where: { institutionId: institution.id, code: { in: [...TARGET_CWIT_DEPARTMENT_CODES] } },
      data: { status: 'active', archivedAt: null },
    })
    await tx.programme.updateMany({
      where: { department: { institutionId: institution.id }, code: { in: [...TARGET_CWIT_PROGRAMME_CODES] } },
      data: { status: 'active', archivedAt: null },
    })
    await tx.department.updateMany({
      where: { institutionId: institution.id, code: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } },
      data: { status: 'archived', archivedAt: now },
    })
    await tx.programme.updateMany({
      where: { department: { institutionId: institution.id }, code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } },
      data: { status: 'archived', archivedAt: now },
    })
    await tx.classGroup.updateMany({
      where: {
        institutionId: institution.id,
        OR: [
          { department: { code: { notIn: [...TARGET_CWIT_DEPARTMENT_CODES] } } },
          { programme: { code: { notIn: [...TARGET_CWIT_PROGRAMME_CODES] } } },
        ],
      },
      data: { status: 'archived' },
    })
  })

  console.warn(JSON.stringify({ ...report, wroteAt: now.toISOString() }, null, 2))
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await db.$disconnect()
  })

