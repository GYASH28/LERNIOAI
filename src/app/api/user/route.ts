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

    await db.$transaction(async (tx) => {
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
      await tx.roleRequest.deleteMany({ where: { userId: user.id } })
      await tx.institutionMembership.deleteMany({ where: { userId: user.id } })

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
