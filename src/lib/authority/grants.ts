import 'server-only'

import { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError } from '@/lib/auth'
import { normalizeRole, type Role } from '@/lib/roles'
import { validateAuthorityGrantDraft } from '@/lib/authority/grant-policy'

type AuthorityClient = Prisma.TransactionClient

export type AuthorityGrantDraft = {
  userId: string
  role: Role | string
  actorUserId: string
  institutionId?: string | null
  departmentId?: string | null
  departmentCode?: string | null
  programmeId?: string | null
  schemeId?: string | null
  semesterId?: string | null
  classGroupId?: string | null
  subjectId?: string | null
  subjectIds?: readonly string[] | null
  expiresAt?: Date | null
  reason?: string | null
  source?: string | null
  roleRequestId?: string | null
  updatePrimaryRole?: boolean
}

type NormalizedScope = {
  institutionId: string | null
  departmentId: string | null
  departmentCode: string | null
  programmeId: string | null
  schemeId: string | null
  semesterId: string | null
  classGroupId: string | null
  subjectIds: string[]
}

type RoleAssignmentScope = NormalizedScope & {
  subjectId: string | null
}

export async function createAuthorityGrant(input: AuthorityGrantDraft) {
  return db.$transaction((tx) => createAuthorityGrantInTransaction(tx, input))
}

export async function createAuthorityGrantInTransaction(tx: AuthorityClient, input: AuthorityGrantDraft) {
  const role = normalizeRole(input.role)
  const policyError = validateAuthorityGrantDraft(input)
  if (policyError) throw new ApiError('INVALID_AUTHORITY_SCOPE', policyError, 400, false)
  if (role === 'student' || role === 'admin') {
    throw new ApiError('INVALID_AUTHORITY_ROLE', 'Only scoped operational roles can be granted here.', 400, false)
  }

  const now = new Date()
  if (input.expiresAt && input.expiresAt <= now) {
    throw new ApiError('INVALID_EXPIRY', 'The grant expiry must be in the future.', 400, false)
  }

  const target = await tx.user.findUnique({
    where: { id: input.userId },
    select: { id: true, email: true, role: true, status: true },
  })
  if (!target) throw new ApiError('NOT_FOUND', 'Target user not found.', 404, false)
  if (target.status !== 'active') {
    throw new ApiError('USER_DISABLED', 'Restore this account before assigning authority.', 409, false)
  }

  const scope = await resolveGrantScope(tx, input)
  const assignmentScopes = roleAssignmentScopes(role, scope)
  if (assignmentScopes.length === 0) {
    throw new ApiError('INVALID_AUTHORITY_SCOPE', 'The grant did not resolve to a usable authority scope.', 400, false)
  }

  await assertNoActiveDuplicates(tx, input.userId, role, assignmentScopes)

  const scopeSummary = describeScope(scope)
  const metadata = JSON.stringify({
    subjectIds: scope.subjectIds,
    roleRequestId: input.roleRequestId ?? null,
  })

  const grant = await tx.authorityGrant.create({
    data: {
      userId: input.userId,
      role,
      status: 'active',
      institutionId: scope.institutionId,
      departmentId: scope.departmentId,
      departmentCode: scope.departmentCode,
      programmeId: scope.programmeId,
      schemeId: scope.schemeId,
      semesterId: scope.semesterId,
      classGroupId: scope.classGroupId,
      subjectId: scope.subjectIds.length === 1 ? scope.subjectIds[0] : null,
      createdById: input.actorUserId,
      expiresAt: input.expiresAt ?? null,
      reason: input.reason ?? null,
      source: input.source ?? null,
      scopeSummary,
      metadata,
    },
    select: { id: true, role: true, status: true, scopeSummary: true },
  })

  const roleAssignments = []
  for (const assignmentScope of assignmentScopes) {
    const row = await tx.roleAssignment.create({
      data: {
        authorityGrantId: grant.id,
        userId: input.userId,
        role,
        status: 'active',
        institutionId: assignmentScope.institutionId,
        departmentId: assignmentScope.departmentId,
        departmentCode: assignmentScope.departmentCode,
        programmeId: assignmentScope.programmeId,
        schemeId: assignmentScope.schemeId,
        semesterId: assignmentScope.semesterId,
        classGroupId: assignmentScope.classGroupId,
        subjectId: assignmentScope.subjectId,
        assignedById: input.actorUserId,
        expiresAt: input.expiresAt ?? null,
        reason: input.reason ?? null,
        source: input.source ?? null,
        metadata,
      },
      select: { id: true, role: true, status: true },
    })
    roleAssignments.push(row)
  }

  if (role === 'teacher') {
    for (const subjectId of scope.subjectIds) {
      const existingTeaching = await tx.teachingAssignment.findFirst({
        where: {
          teacherId: input.userId,
          subjectId,
          classGroupId: scope.classGroupId,
          status: 'active',
          revokedAt: null,
        },
        select: { id: true },
      })
      if (existingTeaching) {
        throw new ApiError('TEACHING_ASSIGNMENT_EXISTS', 'This active teaching assignment already exists.', 409, false)
      }

      await tx.teachingAssignment.create({
        data: {
          authorityGrantId: grant.id,
          teacherId: input.userId,
          subjectId,
          classGroupId: scope.classGroupId,
          institutionId: scope.institutionId,
          departmentId: scope.departmentId,
          assignedById: input.actorUserId,
          status: 'active',
          expiresAt: input.expiresAt ?? null,
          reason: input.reason ?? null,
          source: input.source ?? null,
          metadata,
        },
      })
    }
  }

  if (role === 'cr' && scope.classGroupId) {
    await tx.classMembership.upsert({
      where: {
        userId_classGroupId: {
          userId: input.userId,
          classGroupId: scope.classGroupId,
        },
      },
      update: {
        authorityGrantId: grant.id,
        role: 'cr',
        status: 'active',
        leftAt: null,
        verifiedById: input.actorUserId,
        reason: input.reason ?? null,
        source: input.source ?? null,
        metadata,
      },
      create: {
        authorityGrantId: grant.id,
        userId: input.userId,
        classGroupId: scope.classGroupId,
        role: 'cr',
        status: 'active',
        verifiedById: input.actorUserId,
        reason: input.reason ?? null,
        source: input.source ?? null,
        metadata,
      },
    })
  }

  const legacyUpdate: Prisma.UserUpdateInput = {
    authorityVersion: { increment: 1 },
  }
  if (input.updatePrimaryRole) {
    legacyUpdate.role = role
    legacyUpdate.departmentCode = scope.departmentCode
    legacyUpdate.assignedSubjects = scope.subjectIds.length ? JSON.stringify(scope.subjectIds) : null
    legacyUpdate.isCR = role === 'cr'
  }

  await tx.user.update({
    where: { id: input.userId },
    data: legacyUpdate,
  })

  await tx.roleAuditLog.create({
    data: {
      actorUserId: input.actorUserId,
      targetUserId: input.userId,
      action: input.roleRequestId ? 'approve' : 'assign',
      role,
      scope: scopeSummary,
      note: input.reason ?? null,
    },
  })

  await tx.auditEvent.create({
    data: {
      actorUserId: input.actorUserId,
      targetUserId: input.userId,
      institutionId: scope.institutionId,
      departmentId: scope.departmentId,
      action: 'authority_grant.created',
      entityType: 'AuthorityGrant',
      entityId: grant.id,
      summary: `Granted ${role} authority to ${target.email}.`,
      metadata: JSON.stringify({
        role,
        scope,
        reason: input.reason ?? null,
        source: input.source ?? null,
        roleRequestId: input.roleRequestId ?? null,
      }),
    },
  })

  return { grant, roleAssignments }
}

export async function revokeAuthorityGrantByAssignment(input: {
  assignmentId: string
  actorUserId: string
  reason?: string | null
}) {
  return db.$transaction(async (tx) => {
    const assignment = await tx.roleAssignment.findUnique({
      where: { id: input.assignmentId },
      select: {
        id: true,
        authorityGrantId: true,
        userId: true,
        role: true,
        status: true,
        user: { select: { email: true } },
      },
    })
    if (!assignment) throw new ApiError('NOT_FOUND', 'Role assignment not found.', 404, false)

    const now = new Date()
    if (!assignment.authorityGrantId) {
      const revoked = await tx.roleAssignment.update({
        where: { id: assignment.id },
        data: {
          status: 'revoked',
          revokedAt: now,
          revokedById: input.actorUserId,
          reason: input.reason ?? undefined,
        },
        select: { id: true, role: true, status: true, revokedAt: true },
      })
      await tx.user.update({
        where: { id: assignment.userId },
        data: { authorityVersion: { increment: 1 } },
      })
      await tx.auditEvent.create({
        data: {
          actorUserId: input.actorUserId,
          targetUserId: assignment.userId,
          action: 'role_assignment.revoked',
          entityType: 'RoleAssignment',
          entityId: assignment.id,
          summary: `Revoked ${assignment.role} from ${assignment.user.email}.`,
        },
      })
      return { assignment: revoked, revokedAssignmentIds: [revoked.id] }
    }

    const grant = await tx.authorityGrant.findUnique({
      where: { id: assignment.authorityGrantId },
      include: {
        roleAssignments: { select: { id: true } },
        teachingAssignments: { select: { id: true } },
        classMemberships: { select: { id: true } },
      },
    })
    if (!grant) throw new ApiError('NOT_FOUND', 'Authority grant not found.', 404, false)

    const revokedAssignments = await tx.roleAssignment.updateMany({
      where: { authorityGrantId: grant.id, status: 'active' },
      data: {
        status: 'revoked',
        revokedAt: now,
        revokedById: input.actorUserId,
        reason: input.reason ?? undefined,
      },
    })

    await tx.teachingAssignment.updateMany({
      where: { authorityGrantId: grant.id, status: 'active' },
      data: {
        status: 'revoked',
        revokedAt: now,
        revokedById: input.actorUserId,
        reason: input.reason ?? undefined,
      },
    })

    await tx.classMembership.updateMany({
      where: { authorityGrantId: grant.id, role: 'cr' },
      data: {
        authorityGrantId: null,
        role: 'student',
        reason: input.reason ?? 'Authority grant revoked.',
      },
    })

    await tx.authorityGrant.update({
      where: { id: grant.id },
      data: {
        status: 'revoked',
        revokedAt: now,
        revokedById: input.actorUserId,
        reason: input.reason ?? undefined,
      },
    })

    const revoked = await tx.roleAssignment.findUniqueOrThrow({
      where: { id: assignment.id },
      select: { id: true, role: true, status: true, revokedAt: true },
    })

    await tx.user.update({
      where: { id: assignment.userId },
      data: { authorityVersion: { increment: 1 } },
    })

    await tx.auditEvent.create({
      data: {
        actorUserId: input.actorUserId,
        targetUserId: assignment.userId,
        institutionId: grant.institutionId,
        departmentId: grant.departmentId,
        action: 'authority_grant.revoked',
        entityType: 'AuthorityGrant',
        entityId: grant.id,
        summary: `Revoked ${grant.role} authority from ${assignment.user.email}.`,
        metadata: JSON.stringify({
          revokedRoleAssignments: revokedAssignments.count,
          reason: input.reason ?? null,
        }),
      },
    })

    return {
      assignment: revoked,
      revokedAssignmentIds: grant.roleAssignments.map((item) => item.id),
    }
  })
}

async function resolveGrantScope(tx: AuthorityClient, input: AuthorityGrantDraft): Promise<NormalizedScope> {
  let institutionId = clean(input.institutionId)
  let departmentId = clean(input.departmentId)
  let departmentCode = clean(input.departmentCode)?.toUpperCase() ?? null
  let programmeId = clean(input.programmeId)
  let schemeId = clean(input.schemeId)
  let semesterId = clean(input.semesterId)
  const classGroupId = clean(input.classGroupId)
  const subjectIds = uniqueIds([input.subjectId, ...(input.subjectIds ?? [])])

  if (classGroupId) {
    const classGroup = await tx.classGroup.findUnique({
      where: { id: classGroupId },
      select: {
        institutionId: true,
        departmentId: true,
        programmeId: true,
        schemeId: true,
        semesterId: true,
        department: { select: { code: true } },
      },
    })
    if (!classGroup) throw new ApiError('CLASS_NOT_FOUND', 'The selected class group does not exist.', 404, false)
    institutionId = institutionId ?? classGroup.institutionId
    departmentId = departmentId ?? classGroup.departmentId
    departmentCode = departmentCode ?? classGroup.department?.code ?? null
    programmeId = programmeId ?? classGroup.programmeId
    schemeId = schemeId ?? classGroup.schemeId
    semesterId = semesterId ?? classGroup.semesterId
  }

  if (subjectIds.length > 0) {
    const subjects = await tx.subject.findMany({
      where: { id: { in: subjectIds } },
      select: { id: true, schemeId: true, semesterId: true },
    })
    if (subjects.length !== subjectIds.length) {
      throw new ApiError('SUBJECT_NOT_FOUND', 'One or more selected subjects do not exist.', 404, false)
    }
    schemeId = schemeId ?? subjects[0]?.schemeId ?? null
    semesterId = semesterId ?? subjects[0]?.semesterId ?? null
  }

  if (departmentId || departmentCode) {
    const department = await tx.department.findFirst({
      where: {
        ...(departmentId ? { id: departmentId } : {}),
        ...(departmentCode ? { code: departmentCode } : {}),
        ...(institutionId ? { institutionId } : {}),
      },
      select: { id: true, code: true, institutionId: true },
    })
    if (!department) throw new ApiError('DEPARTMENT_NOT_FOUND', 'The selected department does not exist.', 404, false)
    departmentId = department.id
    departmentCode = department.code
    institutionId = institutionId ?? department.institutionId
  }

  if (institutionId) {
    const exists = await tx.institution.count({ where: { id: institutionId } })
    if (!exists) throw new ApiError('INSTITUTION_NOT_FOUND', 'The selected institution does not exist.', 404, false)
  }

  return {
    institutionId,
    departmentId,
    departmentCode,
    programmeId,
    schemeId,
    semesterId,
    classGroupId,
    subjectIds,
  }
}

function roleAssignmentScopes(role: Role, scope: NormalizedScope): RoleAssignmentScope[] {
  if (scope.subjectIds.length > 0 && (role === 'teacher' || role === 'reviewer')) {
    return scope.subjectIds.map((subjectId) => ({ ...scope, subjectId }))
  }

  return [{
    ...scope,
    subjectId: scope.subjectIds.length === 1 ? scope.subjectIds[0] : null,
  }]
}

async function assertNoActiveDuplicates(
  tx: AuthorityClient,
  userId: string,
  role: Role,
  scopes: readonly RoleAssignmentScope[],
) {
  for (const scope of scopes) {
    const existing = await tx.roleAssignment.findFirst({
      where: {
        userId,
        role,
        status: 'active',
        revokedAt: null,
        institutionId: scope.institutionId,
        departmentId: scope.departmentId,
        departmentCode: scope.departmentCode,
        classGroupId: scope.classGroupId,
        subjectId: scope.subjectId,
      },
      select: { id: true },
    })
    if (existing) {
      throw new ApiError('ASSIGNMENT_EXISTS', 'This active scoped role assignment already exists.', 409, false)
    }
  }
}

function describeScope(scope: NormalizedScope) {
  return [
    scope.departmentCode ? `Department ${scope.departmentCode}` : null,
    scope.subjectIds.length ? `Subjects ${scope.subjectIds.length}` : null,
    scope.classGroupId ? `Class ${scope.classGroupId}` : null,
    scope.institutionId ? `Institution ${scope.institutionId}` : null,
  ].filter(Boolean).join(' | ') || 'Scoped authority'
}

function clean(value: unknown) {
  const text = String(value ?? '').trim()
  return text.length > 0 ? text : null
}

function uniqueIds(values: readonly unknown[]) {
  return Array.from(new Set(values.map(clean).filter((value): value is string => Boolean(value))))
}
