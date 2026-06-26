import { z } from 'zod'
import { registerCampusUser } from '@/lib/campus-registration'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { CAMPUS_DIVISIONS, CAMPUS_SEMESTERS, CWIT_PROGRAMMES } from '@/lib/campus-auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { toPublicUserDTO } from '@/lib/user-dto'

export async function GET() {
  return withApi(async () => {
    const programmes = await db.programme.findMany({
      where: {
        status: 'active',
        archivedAt: null,
        department: { status: 'active', archivedAt: null },
      },
      orderBy: [
        { department: { code: 'asc' } },
        { code: 'asc' },
      ],
      take: 300,
      select: {
        code: true,
        name: true,
        department: { select: { code: true, name: true } },
      },
    })

    const liveProgrammes = programmes.map((programme) => ({
      departmentCode: programme.department.code,
      departmentName: programme.department.name,
      programmeCode: programme.code,
      programmeName: programme.name,
    }))

    return okResponse({
      programmes: liveProgrammes.length ? liveProgrammes : CWIT_PROGRAMMES,
      semesters: CAMPUS_SEMESTERS,
      divisions: CAMPUS_DIVISIONS,
    })
  })
}

export async function POST(request: Request) {
  return withApi(async () => {
    const body = await request.json().catch(() => null)
    if (!body) {
      throw new ApiError('INVALID_REQUEST', 'Enter the required signup details.', 400, false)
    }

    const email = typeof body.email === 'string' ? body.email : 'unknown'
    const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 'unknown-ip'
    const limiter = await checkRateLimit({
      action: 'student_registration',
      identifier: `${email}:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        `Too many signup attempts. Try again in ${limiter.retryAfterSec} seconds.`,
        429,
        true,
      )
    }

    try {
      const user = await registerCampusUser(body)
      return okResponse({
        user: toPublicUserDTO(user),
      })
    } catch (error) {
      if (error instanceof ApiError) throw error
      if (error instanceof z.ZodError) {
        throw new ApiError(
          'VALIDATION_ERROR',
          error.issues[0]?.message ?? 'Check the signup details and try again.',
          400,
          false,
        )
      }
      throw error
    }
  })
}
