import { NextRequest } from 'next/server';
import { db } from '@/lib/db';
import {
  requirePermission,
  getCurrentUser,
  withApi,
  ApiError,
  okResponse,
} from '@/lib/auth';
import { canAssignRole } from '@/lib/roles';
import { z } from 'zod';

const PatchSchema = z.object({
  status: z.enum(['approved', 'rejected', 'withdrawn']),
  reviewNote: z.string().optional(),
  assignedSubjects: z.array(z.string()).max(20).optional(),
  departmentCode: z.string().optional(),
});

function resolveSubjectScope(input: {
  assignedSubjects?: string[];
  storedSubjectIds?: string | null;
}) {
  if (input.assignedSubjects) return input.assignedSubjects;
  if (!input.storedSubjectIds) return null;

  try {
    const parsed = JSON.parse(input.storedSubjectIds) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)
      : null;
  } catch {
    return null;
  }
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> }
) {
  return withApi(async () => {
    const { id } = await ctx.params;
    const json = await req.json().catch(() => ({}));
    const parsed = PatchSchema.safeParse(json);
    if (!parsed.success) {
      throw new ApiError('BAD_REQUEST', 'Invalid fields in request body.', 400, false);
    }

    const { status, reviewNote, assignedSubjects, departmentCode } = parsed.data;
    const authUser = await getCurrentUser();
    if (!authUser) {
      throw new ApiError('UNAUTHENTICATED', 'Sign in required.', 401, false);
    }

    // Fetch the role request
    const roleRequest = await db.roleRequest.findUnique({
      where: { id },
      include: { user: true },
    });

    if (!roleRequest) {
      throw new ApiError('NOT_FOUND', 'Role request not found.', 404, false);
    }

    if (roleRequest.status !== 'pending') {
      throw new ApiError('BAD_REQUEST', 'Role request is already processed.', 400, false);
    }

    if (status === 'withdrawn') {
      if (roleRequest.userId !== authUser.id) {
        throw new ApiError('FORBIDDEN', 'You cannot withdraw someone else\'s request.', 403, false);
      }

      await db.roleRequest.update({
        where: { id },
        data: { status: 'withdrawn' },
      });

      return okResponse({ status: 'withdrawn' });
    }

    const finalSubjects = resolveSubjectScope({
      assignedSubjects,
      storedSubjectIds: roleRequest.subjectIds,
    });
    const finalDept = departmentCode || roleRequest.departmentCode || roleRequest.user.departmentCode || null;
    const hasApprovalScope = Boolean(finalDept || finalSubjects?.length || roleRequest.user.institutionId);

    // For approval or rejection, require permissions. Non-admin roles must be
    // scoped; missing or malformed legacy subject data grants no broad access.
    const adminUser = await requirePermission('roles.assign', {
      departmentCode: finalDept,
      subjectIds: finalSubjects,
    });
    if (!canAssignRole(adminUser.role, roleRequest.requestedRole)) {
      throw new ApiError('FORBIDDEN', 'Insufficient permissions to assign this role.', 403, false);
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
        });

        await tx.roleAuditLog.create({
          data: {
            actorUserId: adminUser.id,
            targetUserId: roleRequest.userId,
            action: 'reject',
            role: roleRequest.requestedRole,
            note: reviewNote || null,
          },
        });
      });

      return okResponse({ status: 'rejected' });
    }

    // Approved status
    if (!hasApprovalScope) {
      throw new ApiError('MISSING_SCOPE', 'Approving this role requires a department, subject, class, or institution scope.', 400, false);
    }

    await db.$transaction(async (tx) => {
      // 1. Update the user role, department, and assigned subjects
      await tx.user.update({
        where: { id: roleRequest.userId },
        data: {
          role: roleRequest.requestedRole,
          departmentCode: finalDept || null,
          assignedSubjects: finalSubjects ? JSON.stringify(finalSubjects) : null,
          authorityVersion: { increment: 1 },
        },
      });

      const normalizedAssignments = [
        ...(finalDept
          ? [{
              userId: roleRequest.userId,
              role: roleRequest.requestedRole,
              status: 'active',
              institutionId: roleRequest.user.institutionId,
              departmentCode: finalDept,
              assignedById: adminUser.id,
              reason: `Approved role request ${roleRequest.id}`,
            }]
          : []),
        ...(finalSubjects ?? []).map((subjectId) => ({
          userId: roleRequest.userId,
          role: roleRequest.requestedRole,
          status: 'active',
          institutionId: roleRequest.user.institutionId,
          departmentCode: finalDept,
          subjectId,
          assignedById: adminUser.id,
          reason: `Approved role request ${roleRequest.id}`,
        })),
        ...(!finalDept && !finalSubjects?.length && roleRequest.user.institutionId
          ? [{
              userId: roleRequest.userId,
              role: roleRequest.requestedRole,
              status: 'active',
              institutionId: roleRequest.user.institutionId,
              assignedById: adminUser.id,
              reason: `Approved role request ${roleRequest.id}`,
            }]
          : []),
      ];

      for (const assignment of normalizedAssignments) {
        await tx.roleAssignment.create({ data: assignment });
      }

      if (roleRequest.requestedRole === 'teacher') {
        for (const subjectId of finalSubjects ?? []) {
          const existing = await tx.teachingAssignment.findFirst({
            where: {
              teacherId: roleRequest.userId,
              subjectId,
              classGroupId: null,
              status: 'active',
              revokedAt: null,
            },
            select: { id: true },
          });
          if (!existing) {
            await tx.teachingAssignment.create({
              data: {
                teacherId: roleRequest.userId,
                subjectId,
                institutionId: roleRequest.user.institutionId,
                assignedById: adminUser.id,
                status: 'active',
              },
            });
          }
        }
      }

      // 2. Update the role request status
      await tx.roleRequest.update({
        where: { id },
        data: {
          status: 'approved',
          reviewedBy: adminUser.id,
          reviewedAt: new Date(),
          reviewNote: reviewNote || null,
        },
      });

      // 3. Create role audit log
      let scopeDesc = '';
      if (finalDept) scopeDesc += `Dept: ${finalDept} `;
      if (finalSubjects) scopeDesc += `Subjects: ${finalSubjects.join(', ')}`;

      await tx.roleAuditLog.create({
        data: {
          actorUserId: adminUser.id,
          targetUserId: roleRequest.userId,
          action: 'approve',
          role: roleRequest.requestedRole,
          scope: scopeDesc || null,
          note: reviewNote || null,
        },
      });

      await tx.auditEvent.create({
        data: {
          actorUserId: adminUser.id,
          targetUserId: roleRequest.userId,
          institutionId: roleRequest.user.institutionId,
          action: 'role_request.approved',
          entityType: 'RoleRequest',
          entityId: roleRequest.id,
          summary: `Approved ${roleRequest.requestedRole} request.`,
          metadata: JSON.stringify({
            role: roleRequest.requestedRole,
            departmentCode: finalDept,
            subjectIds: finalSubjects ?? [],
          }),
        },
      });
    });

    return okResponse({ status: 'approved' });
  });
}
