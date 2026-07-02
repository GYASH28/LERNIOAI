import { db } from '../src/lib/db'
import { ROLES, normalizeRole, type Role } from '../src/lib/roles'
import { buildClassGroupKey, parseAssignedSubjectIds } from '../src/lib/authority/scope'

type BackfillAction =
  | 'institution_membership'
  | 'class_group'
  | 'class_membership'
  | 'role_assignment'
  | 'teaching_assignment'
  | 'audit_event'

interface Counters {
  inspectedUsers: number
  created: Record<BackfillAction, number>
  skipped: Record<string, number>
  issues: string[]
}

const elevatedRoles = new Set<Role>(['cr', 'teacher', 'coordinator', 'moderator', 'reviewer', 'admin'])
const write = process.argv.includes('--write')

const counters: Counters = {
  inspectedUsers: 0,
  created: {
    institution_membership: 0,
    class_group: 0,
    class_membership: 0,
    role_assignment: 0,
    teaching_assignment: 0,
    audit_event: 0,
  },
  skipped: {},
  issues: [],
}

async function main() {
  const inventory = await collectInventory()
  const fallbackInstitution = await db.institution.findFirst({
    orderBy: { createdAt: 'asc' },
    select: { id: true, code: true },
  })

  const users = await db.user.findMany({
    orderBy: { createdAt: 'asc' },
    select: {
      id: true,
      email: true,
      role: true,
      institutionId: true,
      schemeId: true,
      semesterNumber: true,
      departmentCode: true,
      division: true,
      assignedSubjects: true,
      isCR: true,
    },
  })

  for (const user of users) {
    counters.inspectedUsers += 1
    const role = normalizeRole(user.role)
    const institutionId = user.institutionId || fallbackInstitution?.id || null
    const subjectIds = parseAssignedSubjectIds(user.assignedSubjects)
    const classGroupCode = buildClassGroupKey({
      departmentCode: user.departmentCode,
      semesterNumber: user.semesterNumber,
      division: user.division,
    })

    if (institutionId) {
      await ensureInstitutionMembership(user.id, institutionId)
    } else if (role !== 'student') {
      issue(user.email, 'missing institution; elevated role was not backfilled to institution scope')
    }

    let classGroupId: string | null = null
    if (institutionId && classGroupCode) {
      classGroupId = await ensureClassGroup({
        institutionId,
        code: classGroupCode,
        departmentCode: user.departmentCode,
        semesterNumber: user.semesterNumber,
        division: user.division,
      })
      await ensureClassMembership({
        userId: user.id,
        classGroupId,
        role: role === 'cr' || user.isCR ? 'cr' : 'student',
      })
    } else if (role === 'cr' || user.isCR) {
      issue(user.email, 'missing complete class scope; CR assignment was not backfilled')
    }

    if (!elevatedRoles.has(role)) continue

    if (role === 'admin') {
      await ensureRoleAssignment({
        userId: user.id,
        role,
        institutionId,
        reason: 'Legacy admin role backfill',
      })
      continue
    }

    if (role === 'cr') {
      if (!classGroupId) {
        incrementSkip('cr_without_class_scope')
        continue
      }
      await ensureRoleAssignment({
        userId: user.id,
        role,
        institutionId,
        classGroupId,
        reason: 'Legacy CR role backfill',
      })
      continue
    }

    const hasDepartmentScope = Boolean(user.departmentCode)
    const hasSubjectScope = subjectIds.length > 0
    if (!hasDepartmentScope && !hasSubjectScope) {
      issue(user.email, `legacy ${role} role has no department or subject scope; no broad authority created`)
      incrementSkip('elevated_without_scope')
      continue
    }

    if (hasDepartmentScope) {
      await ensureRoleAssignment({
        userId: user.id,
        role,
        institutionId,
        departmentCode: user.departmentCode,
        reason: `Legacy ${role} department role backfill`,
      })
    }

    for (const subjectId of subjectIds) {
      await ensureRoleAssignment({
        userId: user.id,
        role,
        institutionId,
        departmentCode: user.departmentCode,
        subjectId,
        reason: `Legacy ${role} subject role backfill`,
      })

      if (role === 'teacher') {
        await ensureTeachingAssignment({
          teacherId: user.id,
          subjectId,
          institutionId,
        })
      }
    }
  }

  console.warn(
    JSON.stringify(
      {
        mode: write ? 'write' : 'dry-run',
        inventory,
        counters,
        nextStep: write
          ? 'Backfill completed. Review issues before removing legacy authorization fields.'
          : 'Dry run only. Re-run with npm run db:authority:backfill -- --write to apply.',
      },
      null,
      2,
    ),
  )
}

async function collectInventory() {
  const usersByRole = await Promise.all(
    ROLES.map(async (role) => ({
      role,
      count: await db.user.count({ where: { role } }),
    })),
  )

  return {
    usersByRole,
    usersWithAssignedSubjects: await db.user.count({ where: { assignedSubjects: { not: null } } }),
    crUsers: await db.user.count({ where: { OR: [{ role: 'cr' }, { isCR: true }] } }),
    departments: await db.department.count(),
    schemes: await db.academicScheme.count(),
    semesters: await db.semester.count(),
    subjects: await db.subject.count(),
    inviteCodes: await db.inviteCode.count(),
    roleRequests: await db.roleRequest.count(),
    roleAuditLogs: await db.roleAuditLog.count(),
    institutionMemberships: await db.institutionMembership.count(),
    roleAssignments: await db.roleAssignment.count(),
    teachingAssignments: await db.teachingAssignment.count(),
    classGroups: await db.classGroup.count(),
    classMemberships: await db.classMembership.count(),
  }
}

async function ensureInstitutionMembership(userId: string, institutionId: string) {
  const exists = await db.institutionMembership.findUnique({
    where: { userId_institutionId: { userId, institutionId } },
    select: { id: true },
  })
  if (exists) return

  counters.created.institution_membership += 1
  if (!write) return

  await db.institutionMembership.create({
    data: {
      userId,
      institutionId,
      status: 'verified',
      verificationMethod: 'role_backfill',
      verifiedAt: new Date(),
    },
  })
}

async function ensureClassGroup(input: {
  institutionId: string
  code: string
  departmentCode?: string | null
  semesterNumber?: number | null
  division?: string | null
}) {
  const existing = await db.classGroup.findUnique({
    where: { institutionId_code: { institutionId: input.institutionId, code: input.code } },
    select: { id: true },
  })
  if (existing) return existing.id

  counters.created.class_group += 1
  if (!write) return `dry-run:${input.code}`

  const department = input.departmentCode
    ? await db.department.findFirst({
        where: { institutionId: input.institutionId, code: input.departmentCode },
        select: { id: true },
      })
    : null

  const group = await db.classGroup.create({
    data: {
      institutionId: input.institutionId,
      departmentId: department?.id ?? null,
      code: input.code,
      name: `${input.departmentCode ?? 'Class'} Semester ${input.semesterNumber ?? '?'} ${input.division ?? ''}`.trim(),
      semesterNumber: input.semesterNumber ?? null,
      division: input.division ?? null,
    },
    select: { id: true },
  })
  return group.id
}

async function ensureClassMembership(input: {
  userId: string
  classGroupId: string
  role: 'student' | 'cr'
}) {
  if (input.classGroupId.startsWith('dry-run:')) {
    counters.created.class_membership += 1
    return
  }

  const exists = await db.classMembership.findUnique({
    where: { userId_classGroupId: { userId: input.userId, classGroupId: input.classGroupId } },
    select: { id: true },
  })
  if (exists) return

  counters.created.class_membership += 1
  if (!write) return

  await db.classMembership.create({
    data: {
      userId: input.userId,
      classGroupId: input.classGroupId,
      role: input.role,
      status: 'active',
    },
  })
}

async function ensureRoleAssignment(input: {
  userId: string
  role: Role
  institutionId?: string | null
  departmentCode?: string | null
  classGroupId?: string | null
  subjectId?: string | null
  reason: string
}) {
  if (input.classGroupId?.startsWith('dry-run:')) {
    counters.created.role_assignment += 1
    return
  }

  const exists = await db.roleAssignment.findFirst({
    where: {
      userId: input.userId,
      role: input.role,
      status: 'active',
      institutionId: input.institutionId ?? null,
      departmentCode: input.departmentCode ?? null,
      classGroupId: input.classGroupId ?? null,
      subjectId: input.subjectId ?? null,
      revokedAt: null,
    },
    select: { id: true },
  })
  if (exists) return

  counters.created.role_assignment += 1
  counters.created.audit_event += 1
  if (!write) return

  await db.$transaction(async (tx) => {
    const assignment = await tx.roleAssignment.create({
      data: {
        userId: input.userId,
        role: input.role,
        status: 'active',
        institutionId: input.institutionId ?? null,
        departmentCode: input.departmentCode ?? null,
        classGroupId: input.classGroupId ?? null,
        subjectId: input.subjectId ?? null,
        reason: input.reason,
      },
      select: { id: true },
    })
    await tx.auditEvent.create({
      data: {
        targetUserId: input.userId,
        institutionId: input.institutionId ?? null,
        action: 'role_assignment.backfilled',
        entityType: 'RoleAssignment',
        entityId: assignment.id,
        summary: input.reason,
        metadata: JSON.stringify({
          role: input.role,
          departmentCode: input.departmentCode ?? null,
          classGroupId: input.classGroupId ?? null,
          subjectId: input.subjectId ?? null,
        }),
      },
    })
    await tx.user.update({
      where: { id: input.userId },
      data: { authorityVersion: { increment: 1 } },
    })
  })
}

async function ensureTeachingAssignment(input: {
  teacherId: string
  subjectId: string
  institutionId?: string | null
}) {
  const exists = await db.teachingAssignment.findFirst({
    where: {
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      classGroupId: null,
      status: 'active',
      revokedAt: null,
    },
    select: { id: true },
  })
  if (exists) return

  counters.created.teaching_assignment += 1
  if (!write) return

  await db.teachingAssignment.create({
    data: {
      teacherId: input.teacherId,
      subjectId: input.subjectId,
      institutionId: input.institutionId ?? null,
      status: 'active',
    },
  })
}

function incrementSkip(key: string) {
  counters.skipped[key] = (counters.skipped[key] ?? 0) + 1
}

function issue(email: string, message: string) {
  counters.issues.push(`${email}: ${message}`)
}

main()
  .catch((error) => {
    console.error(error)
    process.exitCode = 1
  })
  .finally(async () => {
    await db.$disconnect()
  })
