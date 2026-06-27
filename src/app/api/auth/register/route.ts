import { z } from 'zod'
import { campusSignUpSchema, registerCampusUser } from '@/lib/campus-registration'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { CAMPUS_DIVISIONS, CAMPUS_SEMESTERS, CWIT_PROGRAMMES } from '@/lib/campus-auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { toPublicUserDTO } from '@/lib/user-dto'
import { assertRequestBodySize } from '@/lib/schemas'

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
    assertRequestBodySize(request, 32 * 1024)

    const body = await request.json().catch(() => null)
    if (!body) {
      throw new ApiError('INVALID_REQUEST', 'Enter the required signup details.', 400, false)
    }

    const parsed = campusSignUpSchema.safeParse(body)
    if (!parsed.success) {
      throw new ApiError(
        'VALIDATION_ERROR',
        parsed.error.issues[0]?.message ?? 'Check the signup details and try again.',
        400,
        false,
      )
    }

    const email = parsed.data.email.trim().toLowerCase()
    const ip =
      request.headers.get('x-vercel-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ||
      request.headers.get('x-real-ip')?.trim() ||
      'unknown-ip'

    const emailLimiter = await checkRateLimit({
      action: 'student_registration',
      identifier: `${email}:${ip}`,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    const ipLimiter = await checkRateLimit({
      action: 'student_registration_ip',
      identifier: ip,
      limit: 25,
      windowMs: 15 * 60 * 1000,
    })
    if (!emailLimiter.allowed || !ipLimiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        `Too many signup attempts. Try again in ${emailLimiter.retryAfterSec || ipLimiter.retryAfterSec} seconds.`,
        429,
        true,
      )
    }

    try {
      const user = await registerCampusUser(parsed.data)
      return okResponse({
        user: toPublicUserDTO(user),
        verificationRequired: true,
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
