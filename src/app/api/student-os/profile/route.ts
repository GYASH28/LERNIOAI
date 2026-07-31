import { NextRequest } from 'next/server'
import { db } from '@/lib/db'
import { ApiError, okResponse, requireUser, withApi } from '@/lib/auth'

const LANGUAGE_MAP = {
  english: 'en',
  hinglish: 'hi',
  marathi: 'mr',
} as const

export async function GET() {
  return withApi(async () => {
    const user = await requireUser()
    const profile = await db.user.findUnique({
      where: { id: user.id },
      select: {
        departmentCode: true,
        semesterNumber: true,
        dailyMins: true,
        preferredLang: true,
        examDate: true,
      },
    })
    if (!profile) throw new ApiError('NOT_FOUND', 'Profile not found.', 404, false)
    return okResponse(profile)
  })
}

export async function PATCH(req: NextRequest) {
  return withApi(async () => {
    const user = await requireUser()
    let body: unknown
    try {
      body = await req.json()
    } catch {
      throw new ApiError('BAD_REQUEST', 'Invalid request body.', 400, false)
    }
    if (!body || typeof body !== 'object') {
      throw new ApiError('BAD_REQUEST', 'Profile preferences are required.', 400, false)
    }

    const input = body as Record<string, unknown>
    const data: { dailyMins?: number; preferredLang?: string } = {}

    if (input.dailyMinutes !== undefined) {
      if (
        typeof input.dailyMinutes !== 'number' ||
        !Number.isInteger(input.dailyMinutes) ||
        input.dailyMinutes < 15 ||
        input.dailyMinutes > 480
      ) {
        throw new ApiError('BAD_REQUEST', 'Daily study time must be between 15 and 480 minutes.', 400, false)
      }
      data.dailyMins = input.dailyMinutes
    }

    if (input.language !== undefined) {
      if (typeof input.language !== 'string' || !(input.language in LANGUAGE_MAP)) {
        throw new ApiError('BAD_REQUEST', 'Unsupported learning language.', 400, false)
      }
      data.preferredLang = LANGUAGE_MAP[input.language as keyof typeof LANGUAGE_MAP]
    }

    if (Object.keys(data).length === 0) {
      throw new ApiError('BAD_REQUEST', 'No supported profile changes were provided.', 400, false)
    }

    const updated = await db.user.update({
      where: { id: user.id },
      data,
      select: { dailyMins: true, preferredLang: true },
    })
    return okResponse(updated)
  })
}
