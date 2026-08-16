import { z } from 'zod'
import { registerCampusUser } from '@/lib/campus-registration'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { checkRateLimit } from '@/lib/rate-limit'
import { toPublicUserDTO } from '@/lib/user-dto'
import { assertRequestBodySize, passwordPolicySchema } from '@/lib/schemas'

const accountSignUpSchema = z.object({
  name: z.string().trim().min(2, 'Enter your full name.').max(120),
  email: z.string().trim().email('Enter a valid email address.'),
  password: passwordPolicySchema,
  inviteCode: z.string().trim().max(120).optional(),
})

export async function GET() {
  return withApi(async () => okResponse({
    boards: ['CBSE'],
    classLevels: ['11', '12', 'DROPPER'],
    streams: ['PCM', 'PCB', 'PCMB'],
    preparationGoals: ['BOARDS', 'JEE_MAIN', 'JEE_ADVANCED'],
    verificationRequired: true,
  }))
}

export async function POST(request: Request) {
  return withApi(async () => {
    await assertRequestBodySize(request, 32 * 1024)

    const body = await request.json().catch(() => null)
    if (!body) {
      throw new ApiError('INVALID_REQUEST', 'Enter the required signup details.', 400, false)
    }

    const parsed = accountSignUpSchema.safeParse(body)
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
        next: '/onboarding',
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
