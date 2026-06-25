import crypto from 'crypto'
import { ApiError, getCurrentUser, okResponse, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseBody, verifyEmailRequestSchema } from '@/lib/schemas'

export async function POST(req: Request) {
  return withApi(async () => {
    const authUser = await getCurrentUser()
    const email = authUser?.email ?? (await parseBody(req, verifyEmailRequestSchema)).email
    const normalizedEmail = email.toLowerCase()

    const limiter = await checkRateLimit({
      action: 'verify_email_request',
      identifier: normalizedEmail,
      limit: 3,
      windowMs: 15 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        'Too many requests. Please try again later.',
        429,
        true,
      )
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, emailVerified: true },
    })

    if (!user) {
      return okResponse({ sent: true })
    }

    if (user.emailVerified) {
      return okResponse({ sent: false, alreadyVerified: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.emailVerificationToken.deleteMany({
      where: { email: normalizedEmail },
    })

    await db.emailVerificationToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    })

    try {
      await sendVerificationEmail(normalizedEmail, token)
    } catch (error) {
      console.error('[verify-email/request] email delivery failed:', error)
      throw new ApiError(
        'EMAIL_UNAVAILABLE',
        'Could not send the verification email right now. Please try again later.',
        503,
        true,
      )
    }

    return okResponse({ sent: true })
  })
}
