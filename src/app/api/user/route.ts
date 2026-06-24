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
import { DEMO_USER, isDemoMode } from '@/lib/demo-fixtures'

/**
 * GET /api/user
 * Returns the authenticated user's profile. XP/level/streak are server-authoritative
 * (level is derived from XP — never trusted from the client).
 */
export async function GET() {
  return withApi(async () => {
    if (isDemoMode()) return okResponse(DEMO_USER)

    const user = await requireUser()
    const fresh = await db.user.findUnique({ where: { id: user.id } })
    if (!fresh) {
      throw new ApiError('NOT_FOUND', 'Account not found.', 404, false)
    }
    // Derive level from authoritative XP ledger-cached total.
    const derivedLevel = levelFromXp(fresh.xp)
    if (derivedLevel !== fresh.level) {
      await db.user.update({ where: { id: fresh.id }, data: { level: derivedLevel } })
    }
    return okResponse({ ...fresh, level: derivedLevel })
  })
}

/**
 * PATCH /api/user
 * Updates student-editable profile fields only.
 * XP / level / streak / role are NEVER accepted from the client.
 */
export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    if (isDemoMode()) {
      const body = await parseBody(req, updateProfileSchema)
      return okResponse({ ...DEMO_USER, ...body, level: levelFromXp(DEMO_USER.xp) })
    }

    const user = await requireUser()
    const body = await parseBody(req, updateProfileSchema)

    // Build the Prisma data object from EXPLICIT validated fields only.
    // Never spread body — schema already excludes xp/level/streak/role.
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

    const updated = await db.user.update({ where: { id: user.id }, data })
    return okResponse(updated)
  })
}

/**
 * DELETE /api/user
 *
 * Permanently deletes the authenticated user and ALL their data. Used by the
 * Profile view's "Delete Account" flow (with a typed-DELETE confirmation).
 *
 * Trust model:
 *  - requireUser() enforces auth — a stranger cannot delete someone else.
 *  - No `userId` is accepted from the body. The caller is always the deleted.
 *  - The full cascade runs inside a transaction so a partial failure rolls
 *    back; the user row itself is deleted LAST so the account only disappears
 *    if every dependent row was removed cleanly.
 *
 * NOTE: in demo mode the demo student will be deleted — re-seed to restore.
 */
export async function DELETE() {
  return withApi(async () => {
    if (isDemoMode()) {
      throw new ApiError('DEMO_MODE', 'Demo accounts cannot be deleted.', 400, false)
    }

    const user = await requireUser()

    await db.$transaction(async (tx) => {
      // Tutor messages are linked through TutorSession, which is owned by the
      // user — delete them first to avoid a cascading delete from the session
      // FK failing on some SQLite configurations.
      await tx.tutorMessage.deleteMany({
        where: { session: { userId: user.id } },
      })
      await tx.tutorSession.deleteMany({ where: { userId: user.id } })
      await tx.questionAttempt.deleteMany({ where: { userId: user.id } })
      await tx.quizAttempt.deleteMany({ where: { userId: user.id } })
      await tx.userTopicMastery.deleteMany({ where: { userId: user.id } })
      await tx.revisionSchedule.deleteMany({ where: { userId: user.id } })
      await tx.revisionAttempt.deleteMany({ where: { userId: user.id } })
      await tx.lessonCompletion.deleteMany({ where: { userId: user.id } })
      await tx.studyTask.deleteMany({ where: { userId: user.id } })
      await tx.studySession.deleteMany({ where: { userId: user.id } })
      await tx.codingSubmission.deleteMany({ where: { userId: user.id } })
      await tx.labProgress.deleteMany({ where: { userId: user.id } })
      await tx.userAchievement.deleteMany({ where: { userId: user.id } })
      await tx.xpEvent.deleteMany({ where: { userId: user.id } })
      await tx.contribution.deleteMany({ where: { userId: user.id } })
      await tx.bookmark.deleteMany({ where: { userId: user.id } })

      // Finally, the user row.
      const deleted = await tx.user.deleteMany({ where: { id: user.id } })
      if (deleted.count === 0) {
        throw new ApiError(
          'NOT_FOUND',
          'Account not found — it may have already been deleted.',
          404,
          false,
        )
      }
    })

    return okResponse({ deleted: true })
  })
}
