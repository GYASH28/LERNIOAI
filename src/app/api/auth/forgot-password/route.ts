import crypto from 'crypto'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { forgotPasswordSchema, parseBody } from '@/lib/schemas'

export async function POST(req: Request) {
  return withApi(async () => {
    const { email } = await parseBody(req, forgotPasswordSchema)
    const normalizedEmail = email.toLowerCase()

    const limiter = await checkRateLimit({
      action: 'forgot_password_request',
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
      select: { id: true, status: true },
    })

    if (!user || user.status === 'disabled') {
      return okResponse({ sent: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    })

    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    })

    try {
      await sendPasswordResetEmail(normalizedEmail, token)
    } catch (error) {
      console.error('[forgot-password] email delivery failed:', error)
      throw new ApiError(
        'EMAIL_UNAVAILABLE',
        'Could not send the reset email right now. Please try again later.',
        503,
        true,
      )
    }

    return okResponse({ sent: true })
  })
}
