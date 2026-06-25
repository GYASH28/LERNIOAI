import crypto from 'crypto'
import { hash } from 'bcryptjs'
import { ApiError, okResponse, withApi } from '@/lib/auth'
import { db } from '@/lib/db'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseBody, resetPasswordSchema } from '@/lib/schemas'

export async function POST(req: Request) {
  return withApi(async () => {
    const { token, password } = await parseBody(req, resetPasswordSchema)
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')

    const dbToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    })

    if (!dbToken || dbToken.expiresAt <= new Date() || dbToken.usedAt) {
      throw new ApiError('INVALID_TOKEN', 'Invalid or expired token.', 400, false)
    }

    const limiter = await checkRateLimit({
      action: 'reset_password_attempt',
      identifier: dbToken.email,
      limit: 5,
      windowMs: 15 * 60 * 1000,
    })
    if (!limiter.allowed) {
      throw new ApiError(
        'RATE_LIMITED',
        'Too many attempts. Please try again later.',
        429,
        true,
      )
    }

    const user = await db.user.findUnique({
      where: { email: dbToken.email },
      select: { id: true, status: true },
    })

    if (!user || user.status === 'disabled') {
      throw new ApiError(
        'ACCOUNT_INACTIVE',
        'User account is inactive or disabled.',
        400,
        false,
      )
    }

    const passwordHash = await hash(password, 12)

    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      })

      await tx.passwordResetToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      })

      await tx.session.deleteMany({
        where: { userId: user.id },
      })
    })

    return okResponse({ reset: true })
  })
}
