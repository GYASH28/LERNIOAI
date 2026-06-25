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
  assignedSubjects: z.array(z.string()).optional(),
  departmentCode: z.string().optional(),
});

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

    // For approval or rejection, require permissions
    const adminUser = await requirePermission('role.assign');
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
    await db.$transaction(async (tx) => {
      let finalSubjects: string[] | null = null;
      if (assignedSubjects) {
        finalSubjects = assignedSubjects;
      } else if (roleRequest.subjectIds) {
        try {
          finalSubjects = JSON.parse(roleRequest.subjectIds) as string[];
        } catch {
          finalSubjects = roleRequest.subjectIds.split(',').map((s) => s.trim());
        }
      }
      const finalDept = departmentCode || roleRequest.departmentCode;

      // 1. Update the user role, department, and assigned subjects
      await tx.user.update({
        where: { id: roleRequest.userId },
        data: {
          role: roleRequest.requestedRole,
          departmentCode: finalDept || null,
          assignedSubjects: finalSubjects ? JSON.stringify(finalSubjects) : null,
        },
      });

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
    });

    return okResponse({ status: 'approved' });
  });
}
