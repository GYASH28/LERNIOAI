import { NextRequest } from 'next/server'
import type { Prisma } from '@prisma/client'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'
import { parseBody, videoWatchProgressSchema } from '@/lib/schemas'
import { studentLessonResourceWhere } from '@/lib/resources/student-publication-policy'
import { calculateVideoCredit } from '@/lib/resources/video-progress-credit'
import {
  getStudentLearningScope,
  hasResolvedLearningScope,
  scopedLessonWhere,
} from '@/features/learning/server/get-student-learning-scope'

const VIDEO_RESOURCE_ROLES = ['primary_video', 'alternate_video', 'lab_demo'] as const

export async function GET(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const scope = await getStudentLearningScope(user.id, { includeSubjects: false })
    if (!hasResolvedLearningScope(scope)) return okResponse([])

    const lessonId = req.nextUrl.searchParams.get('lessonId')
    const resourceId = req.nextUrl.searchParams.get('resourceId')
    const where: Prisma.VideoWatchProgressWhereInput = {
      userId: user.id,
      lesson: scopedLessonWhere(scope),
    }

    if (lessonId) where.lessonId = lessonId
    if (resourceId) where.resourceId = resourceId

    const progress = await db.videoWatchProgress.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: 100,
    })

    return okResponse(progress)
  })
}

export async function POST(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    const body = await parseBody(req, videoWatchProgressSchema)
    const scope = await getStudentLearningScope(user.id, { includeSubjects: false })
    if (!hasResolvedLearningScope(scope)) {
      throw new ApiError('NOT_FOUND', 'Lesson not found.', 404, false)
    }

    const lessonResource = await db.lessonResource.findFirst({
      where: {
        ...studentLessonResourceWhere(),
        lessonId: body.lessonId,
        resourceId: body.resourceId,
        role: { in: [...VIDEO_RESOURCE_ROLES] },
        lesson: scopedLessonWhere(scope),
      },
      select: {
        resource: { select: { durationSeconds: true } },
      },
    })

    if (!lessonResource) {
      throw new ApiError('NOT_FOUND', 'Lesson video not found.', 404, false)
    }

    const existing = await db.videoWatchProgress.findUnique({
      where: {
        userId_lessonId_resourceId: {
          userId: user.id,
          lessonId: body.lessonId,
          resourceId: body.resourceId,
        },
      },
    })

    const now = new Date()
    const credit = calculateVideoCredit({
      previousLastSecond: existing?.lastSecond ?? 0,
      previousWatchedSeconds: existing?.watchedSeconds ?? 0,
      previousCompletedAt: existing?.completedAt ?? null,
      previousUpdatedAt: existing?.updatedAt ?? null,
      currentSecond: body.lastSecond,
      durationSeconds: lessonResource.resource.durationSeconds,
      now,
    })

    const record = await db.videoWatchProgress.upsert({
      where: {
        userId_lessonId_resourceId: {
          userId: user.id,
          lessonId: body.lessonId,
          resourceId: body.resourceId,
        },
      },
      update: {
        lastSecond: credit.lastSecond,
        watchedSeconds: credit.watchedSeconds,
        watchPercent: credit.watchPercent,
        completedAt: credit.completedAt,
      },
      create: {
        userId: user.id,
        lessonId: body.lessonId,
        resourceId: body.resourceId,
        lastSecond: credit.lastSecond,
        watchedSeconds: credit.watchedSeconds,
        watchPercent: credit.watchPercent,
        completedAt: credit.completedAt,
      },
    })

    return okResponse(record)
  })
}
