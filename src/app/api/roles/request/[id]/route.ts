import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requirePermission,
  getCurrentUser,
  withApi,
  ApiError,
  okResponse,
} from '@/lib/auth'
import { canAssignRole, normalizeRole, type Role } from '@/lib/roles'
import { z } from 'zod'

const PatchSchema = z.object({
  status: z.enum(['approved', 'rejected', 'withdrawn']),
  reviewNote: z.string().trim().max(2000).optional(),
  assignedSubjects: z.array(z.string().trim().min(1)).max(20).optional(),
  departmentCode: z.string().trim().max(32).optional(),
  classGroupId: z.string().trim().min(1).optional(),
})

type ScopedAssignmentInput = {
  userId: string
  role: Role
  status: 'active'
  institutionId: string | null
  departmentCode?: string | null
  classGroupId?: string | null
  subjectId?: string | null
  assignedById: string
  reason: string
}

function resolveSubjectScope(input: {
  assignedSubjects?: string[]
  storedSubjectIds?: string | null
}) {
  if (input.assignedSubjects) return Array.from(new Set(input.assignedSubjects))
  if (!input.storedSubjectIds) return []

  try {
    const parsed = JSON.parse(input.storedSubjectIds) as unknown
    return Array.isArray(parsed)
      ? Array.from(new Set(parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)))
      : []
  } catch {
    return []
  }
}

function assertApprovalScope(input: {
  role: Role
  institutionId?: string | null
  departmentCode?: string | null
  subjectIds: string[]
  classGroupId?: string | null
}) {
  const valid = (() => {
    switch (input.role) {
      case 'cr':
        return Boolean(input.classGroupId)
      case 'teacher':
        return input.subjectIds.length > 0
      case 'coordinator':
        return Boolean(input.departmentCode)
      case 'reviewer':
        return Boolean(input.departmentCode || input.subjectIds.length)
      case 'moderator':
        return Boolean(input.institutionId || input.departmentCode)
      default:
        return false
    }
  })()

  if (valid) return

  const requirements: Partial<Record<Role, string>> = {
    cr: 'Approving a CR requires a valid class-group ID.',
    teacher: 'Approving a Teacher requires at least one subject ID.',
    coordinator: 'Approving a Coordinator requires a department code.',
    reviewer: 'Approving a Reviewer requires a subject ID or department code.',
    moderator: 'Approving a Moderator requires an institution or department scope.',
  }
  throw new ApiError(
    'MISSING_SCOPE',
    requirements[input.role] ?? 'This role request does not have a valid authority scope.',
    400,
    false,
  )
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  return withApi(async () => {
    const { id } = await ctx.params
    const json = await req.json().catch(() => ({}))
    const parsed = PatchSchema.safeParse(json)
    if (!parsed.success) {
      throw new ApiError('BAD_REQUEST', parsed.error.issues[0]?.message ?? 'Invalid fields in request body.', 400, false)
    }

    const { status, reviewNote, assignedSubjects, departmentCode, classGroupId } = parsed.data
    const authUser = await getCurrentUser()
    if (!authUser) {
      throw new ApiError('UNAUTHENTICATED', 'Sign in required.', 401, false)
    }

    const roleRequest = await db.roleRequest.findUnique({
      where: { id },
      include: { user: true },
    })

    if (!roleRequest) {
      throw new ApiError('NOT_FOUND', 'Role request not found.', 404, false)
    }
    if (roleRequest.status !== 'pending') {
      throw new ApiError('BAD_REQUEST', 'Role request is already processed.', 400, false)
    }

    if (status === 'withdrawn') {
      if (roleRequest.userId !== authUser.id) {
        throw new ApiError('FORBIDDEN', 'You cannot withdraw someone else’s request.', 403, false)
      }

      await db.$transaction(async (tx) => {
        await tx.roleRequest.update({
          where: { id },
          data: { status: 'withdrawn' },
        })
        await tx.auditEvent.create({
          data: {
            actorUserId: authUser.id,
            targetUserId: authUser.id,
            institutionId: roleRequest.user.institutionId,
            action: 'role_request.withdrawn',
            entityType: 'RoleRequest',
            entityId: roleRequest.id,
            summary: `Withdrew ${roleRequest.requestedRole} request.`,
          },
        })
      })

      return okResponse({ status: 'withdrawn' })
    }

    const requestedRole = normalizeRole(roleRequest.requestedRole)
    const finalSubjects = resolveSubjectScope({
      assignedSubjects,
      storedSubjectIds: roleRequest.subjectIds,
    })
    const finalDept = (departmentCode || roleRequest.departmentCode || roleRequest.user.departmentCode || '').trim().toUpperCase() || null
    const finalClassGroupId = classGroupId || null

    const adminUser = await requirePermission('roles.assign', {
      institutionId: roleRequest.user.institutionId,
      departmentCode: finalDept,
      subjectIds: finalSubjects,
      classGroupId: finalClassGroupId,
    })
    if (!canAssignRole(adminUser.role, requestedRole)) {
      throw new ApiError('FORBIDDEN', 'Insufficient permissions to assign this role.', 403, false)
    }

    if (status === 'rejected') {
      await db.$transaction(async (tx) => {
        await tx.roleRequest.update({
          where: { id },
          data: {
            status: 'rejected',
            reviewedBy: adminUser.id,
            reviewedAt: new Date(),
            reviewNote: reviewNote || null,
          },
        })
        await tx.roleAuditLog.create({
          data: {
            actorUserId: adminUser.id,
            targetUserId: roleRequest.userId,
            action: 'reject',
            role: requestedRole,
            note: reviewNote || null,
          },
        })
        await tx.auditEvent.create({
          data: {
            actorUserId: adminUser.id,
            targetUserId: roleRequest.userId,
            institutionId: roleRequest.user.institutionId,
            action: 'role_request.rejected',
            entityType: 'RoleRequest',
            entityId: roleRequest.id,
            summary: `Rejected ${requestedRole} request.`,
            metadata: JSON.stringify({ reviewNote: reviewNote || null }),
          },
        })
      })

      return okResponse({ status: 'rejected' })
    }

    assertApprovalScope({
      role: requestedRole,
      institutionId: roleRequest.user.institutionId,
      departmentCode: finalDept,
      subjectIds: finalSubjects,
      classGroupId: finalClassGroupId,
    })

    const classGroup = finalClassGroupId
      ? await db.classGroup.findUnique({
          where: { id: finalClassGroupId },
          select: { id: true, institutionId: true, department: { select: { code: true } } },
        })
      : null
    if (finalClassGroupId && !classGroup) {
      throw new ApiError('CLASS_NOT_FOUND', 'The selected class group does not exist.', 404, false)
    }

    if (finalSubjects.length > 0) {
      const subjectCount = await db.subject.count({ where: { id: { in: finalSubjects } } })
      if (subjectCount !== finalSubjects.length) {
        throw new ApiError('SUBJECT_NOT_FOUND', 'One or more selected subjects do not exist.', 404, false)
      }
    }

    const effectiveInstitutionId = roleRequest.user.institutionId || classGroup?.institutionId || null
    const effectiveDepartmentCode = finalDept || classGroup?.department?.code || null

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: roleRequest.userId },
        data: {
          role: requestedRole,
          departmentCode: effectiveDepartmentCode,
          assignedSubjects: finalSubjects.length ? JSON.stringify(finalSubjects) : null,
          isCR: requestedRole === 'cr',
          authorityVersion: { increment: 1 },
        },
      })

      const assignmentInputs: ScopedAssignmentInput[] = [
        ...(effectiveDepartmentCode && ['coordinator', 'reviewer', 'moderator'].includes(requestedRole)
          ? [{
              userId: roleRequest.userId,
              role: requestedRole,
              status: 'active' as const,
              institutionId: effectiveInstitutionId,
              departmentCode: effectiveDepartmentCode,
              assignedById: adminUser.id,
              reason: `Approved role request ${roleRequest.id}`,
            }]
          : []),
        ...finalSubjects.map((subjectId) => ({
          userId: roleRequest.userId,
          role: requestedRole,
          status: 'active' as const,
          institutionId: effectiveInstitutionId,
          departmentCode: effectiveDepartmentCode,
          subjectId,
          assignedById: adminUser.id,
          reason: `Approved role request ${roleRequest.id}`,
        })),
        ...(finalClassGroupId
          ? [{
              userId: roleRequest.userId,
              role: requestedRole,
              status: 'active' as const,
              institutionId: effectiveInstitutionId,
              departmentCode: effectiveDepartmentCode,
              classGroupId: finalClassGroupId,
              assignedById: adminUser.id,
              reason: `Approved role request ${roleRequest.id}`,
            }]
          : []),
        ...(!effectiveDepartmentCode && !finalSubjects.length && !finalClassGroupId && effectiveInstitutionId
          ? [{
              userId: roleRequest.userId,
              role: requestedRole,
              status: 'active' as const,
              institutionId: effectiveInstitutionId,
              assignedById: adminUser.id,
              reason: `Approved role request ${roleRequest.id}`,
            }]
          : []),
      ]

      for (const assignment of assignmentInputs) {
        const existing = await tx.roleAssignment.findFirst({
          where: {
            userId: assignment.userId,
            role: assignment.role,
            status: 'active',
            institutionId: assignment.institutionId,
            departmentCode: assignment.departmentCode ?? null,
            classGroupId: assignment.classGroupId ?? null,
            subjectId: assignment.subjectId ?? null,
            revokedAt: null,
          },
          select: { id: true },
        })
        if (!existing) {
          await tx.roleAssignment.create({ data: assignment })
        }
      }

      if (requestedRole === 'teacher') {
        for (const subjectId of finalSubjects) {
          const existing = await tx.teachingAssignment.findFirst({
            where: {
              teacherId: roleRequest.userId,
              subjectId,
              classGroupId: finalClassGroupId,
              status: 'active',
              revokedAt: null,
            },
            select: { id: true },
          })
          if (!existing) {
            await tx.teachingAssignment.create({
              data: {
                teacherId: roleRequest.userId,
                subjectId,
                classGroupId: finalClassGroupId,
                institutionId: effectiveInstitutionId,
                assignedById: adminUser.id,
                status: 'active',
              },
            })
          }
        }
      }

      if (requestedRole === 'cr' && finalClassGroupId) {
        await tx.classMembership.upsert({
          where: {
            userId_classGroupId: {
              userId: roleRequest.userId,
              classGroupId: finalClassGroupId,
            },
          },
          update: {
            role: 'cr',
            status: 'active',
            leftAt: null,
            verifiedById: adminUser.id,
          },
          create: {
            userId: roleRequest.userId,
            classGroupId: finalClassGroupId,
            role: 'cr',
            status: 'active',
            verifiedById: adminUser.id,
          },
        })
      }

      await tx.roleRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || null,
        },
      })

      const scopeDesc = [
        effectiveDepartmentCode ? `Dept: ${effectiveDepartmentCode}` : null,
        finalSubjects.length ? `Subjects: ${finalSubjects.join(', ')}` : null,
        finalClassGroupId ? `Class: ${finalClassGroupId}` : null,
        effectiveInstitutionId ? `Institution: ${effectiveInstitutionId}` : null,
      ].filter(Boolean).join(' | ')

      await tx.roleAuditLog.create({
        data: {
          actorUserId: adminUser.id,
          targetUserId: roleRequest.userId,
          action: 'approve',
          role: requestedRole,
          scope: scopeDesc || null,
          note: reviewNote || null,
        },
      })

      await tx.auditEvent.create({
        data: {
          actorUserId: adminUser.id,
          targetUserId: roleRequest.userId,
          institutionId: effectiveInstitutionId,
          action: 'role_request.approved',
          entityType: 'RoleRequest',
          entityId: roleRequest.id,
          summary: `Approved ${requestedRole} request.`,
          metadata: JSON.stringify({
            role: requestedRole,
            departmentCode: effectiveDepartmentCode,
            subjectIds: finalSubjects,
            classGroupId: finalClassGroupId,
          }),
        },
      })
    })

    return okResponse({ status: 'approved' })
  })
}
