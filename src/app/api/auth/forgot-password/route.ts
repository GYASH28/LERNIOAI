import crypto from 'crypto'
import { db } from '@/lib/db'
import { sendPasswordResetEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { forgotPasswordSchema, parseBody } from '@/lib/schemas'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  return withApi(async () => {
    const { email } = await parseBody(req, forgotPasswordSchema)

    const limiter = await checkRateLimit({
      action: 'forgot_password_request',
      identifier: email,
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
      where: { email },
      select: { id: true, status: true },
    })

    if (!user || user.status === 'disabled') {
      return okResponse({ sent: true })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000)

    await db.passwordResetToken.deleteMany({ where: { email } })
    await db.passwordResetToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    })

    await sendPasswordResetEmail(email, token)

    return okResponse({ sent: true })
  })
}
