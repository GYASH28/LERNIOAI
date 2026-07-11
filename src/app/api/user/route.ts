import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import {
  requireUser,
  withApi,
  okResponse,
  ApiError,
} from '@/lib/auth'
import { parseBody, updateProfileSchema } from '@/lib/schemas'
import { levelFromXp } from '@/lib/xp'
import { DEMO_AUTH_USER, DEMO_USER, isDemoMode } from '@/lib/demo-fixtures'
import { publicUserSelect, toPublicUserDTO } from '@/lib/user-dto'

function isDemoFallbackUser(user: { id: string }) {
  return isDemoMode() && user.id === DEMO_AUTH_USER.id
}

/**
 * GET /api/user
 * Returns the authenticated user's profile. A real authenticated session always
 * takes precedence over demo fixtures, even when demo mode is enabled for a
 * preview deployment.
 */
export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    if (isDemoFallbackUser(user)) return okResponse(toPublicUserDTO(DEMO_USER))

    const fresh = await db.user.findUnique({
      where: { id: user.id },
      select: publicUserSelect,
    })
    if (!fresh) {
      throw new ApiError('NOT_FOUND', 'Account not found.', 404, false)
    }
    const derivedLevel = levelFromXp(fresh.xp)
    if (derivedLevel !== fresh.level) {
      await db.user.update({ where: { id: fresh.id }, data: { level: derivedLevel } })
    }
    return okResponse(toPublicUserDTO({ ...fresh, level: derivedLevel }))
  })
}

/**
 * PATCH /api/user
 * Updates student-editable profile fields only.
 * XP / level / streak / role are NEVER accepted from the client.
 */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, updateProfileSchema)

    if (isDemoFallbackUser(user)) {
      return okResponse(toPublicUserDTO({ ...DEMO_USER, ...body, level: levelFromXp(DEMO_USER.xp) }))
    }

    const data: Record<string, unknown> = {}
    if (body.name !== undefined) data.name = body.name
    if (body.preferredLang !== undefined) data.preferredLang = body.preferredLang
    if (body.examDate !== undefined) data.examDate = body.examDate
    if (body.dailyMins !== undefined) data.dailyMins = body.dailyMins
    if (body.semesterNumber !== undefined) data.semesterNumber = body.semesterNumber
    if (body.institutionId !== undefined) data.institutionId = body.institutionId
    if (body.schemeId !== undefined) data.schemeId = body.schemeId
    if (body.avatar !== undefined) data.avatar = body.avatar
    if (body.onboarded !== undefined) data.onboarded = body.onboarded

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: publicUserSelect,
    })
    return okResponse(toPublicUserDTO(updated))
  })
}

/**
 * DELETE /api/user
 * Permanently deletes the authenticated user and their owned learning data.
 */
export async function DELETE() {
  return withApi(async () => {
    const user = await requireUser()
    if (isDemoFallbackUser(user)) {
      throw new ApiError('DEMO_MODE', 'Demo accounts cannot be deleted.', 400, false)
    }

    // Clean up ALL related records BEFORE deleting the user.
    // We do NOT use $transaction because .catch() inside a transaction
    // doesn't prevent the transaction from aborting — Prisma rolls back
    // the entire transaction if any operation fails.
    // Instead, we run each cleanup independently with .catch() so a
    // failing table doesn't block the rest.
    const cleanup = [
      db.tutorMessage.deleteMany({ where: { session: { userId: user.id } } }),
      db.tutorSession.deleteMany({ where: { userId: user.id } }),
      db.questionAttempt.deleteMany({ where: { userId: user.id } }),
      db.quizAttempt.deleteMany({ where: { userId: user.id } }),
      db.userTopicMastery.deleteMany({ where: { userId: user.id } }),
      db.revisionSchedule.deleteMany({ where: { userId: user.id } }),
      db.revisionAttempt.deleteMany({ where: { userId: user.id } }),
      db.lessonCompletion.deleteMany({ where: { userId: user.id } }),
      db.studyTask.deleteMany({ where: { userId: user.id } }),
      db.studySession.deleteMany({ where: { userId: user.id } }),
      db.codingSubmission.deleteMany({ where: { userId: user.id } }),
      db.labProgress.deleteMany({ where: { userId: user.id } }),
      db.userAchievement.deleteMany({ where: { userId: user.id } }),
      db.xpEvent.deleteMany({ where: { userId: user.id } }),
      db.contribution.deleteMany({ where: { userId: user.id } }),
      db.bookmark.deleteMany({ where: { userId: user.id } }),
      db.roleRequest.deleteMany({ where: { userId: user.id } }),
      db.institutionMembership.deleteMany({ where: { userId: user.id } }),
      db.notification.deleteMany({ where: { userId: user.id } }),
      db.feedback.deleteMany({ where: { userId: user.id } }),
      db.recentlyViewed.deleteMany({ where: { userId: user.id } }),
      db.videoWatchProgress.deleteMany({ where: { userId: user.id } }),
      db.studentElectiveSelection.deleteMany({ where: { userId: user.id } }),
      // Class system
      db.classMember.deleteMany({ where: { userId: user.id } }),
      db.attendanceRecord.deleteMany({ where: { userId: user.id } }),
      db.attendanceSession.deleteMany({ where: { takenById: user.id } }),
      db.classAnnouncement.deleteMany({ where: { authorId: user.id } }),
      db.classTimetable.deleteMany({ where: { teacherId: user.id } }),
      db.class.updateMany({ where: { crId: user.id }, data: { crId: null } }),
      // Authority system
      db.roleAssignment.deleteMany({ where: { userId: user.id } }),
      db.classMembership.deleteMany({ where: { userId: user.id } }),
      db.teachingAssignment.deleteMany({ where: { teacherId: user.id } }),
      db.teachingAssignment.deleteMany({ where: { assignedById: user.id } }),
      db.authorityGrant.deleteMany({ where: { userId: user.id } }),
      db.authorityGrant.deleteMany({ where: { createdById: user.id } }),
      db.authorityGrant.deleteMany({ where: { revokedById: user.id } }),
      // Audit events
      db.auditEvent.deleteMany({ where: { actorUserId: user.id } }),
      db.auditEvent.deleteMany({ where: { targetUserId: user.id } }),
      // Role audit log
      db.roleAuditLog.deleteMany({ where: { actorUserId: user.id } }),
      db.roleAuditLog.deleteMany({ where: { targetUserId: user.id } }),
      // Account/Sessions
      db.account.deleteMany({ where: { userId: user.id } }),
      db.session.deleteMany({ where: { userId: user.id } }),
    ]

    // Run all cleanup — each catches its own error so one failure doesn't block others
    await Promise.allSettled(cleanup)

    // Now delete the user
    const deleted = await db.user.deleteMany({ where: { id: user.id } })
    if (deleted.count === 0) {
      throw new ApiError(
        'NOT_FOUND',
        'Account not found — it may have already been deleted.',
        404,
        false,
      )
    }

    return okResponse({ deleted: true })
  })
}
