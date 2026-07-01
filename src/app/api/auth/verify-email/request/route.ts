import crypto from 'crypto'
import { db } from '@/lib/db'
import { ApiError, getCurrentUser, okResponse, withApi } from '@/lib/auth'
import { sendVerificationEmail } from '@/lib/email'
import { checkRateLimit } from '@/lib/rate-limit'
import { parseBody, verifyEmailRequestSchema } from '@/lib/schemas'

export const runtime = 'nodejs'

export async function POST(req: Request) {
  return withApi(async () => {
    const authUser = await getCurrentUser()
    const email = authUser
      ? authUser.email.trim().toLowerCase()
      : (await parseBody(req, verifyEmailRequestSchema)).email

    const limiter = await checkRateLimit({
      action: 'verify_email_request',
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
      select: { id: true, emailVerified: true },
    })

    if (!user) {
      return okResponse({ sent: true })
    }

    if (user.emailVerified) {
      return okResponse({ sent: false, message: 'Email is already verified.' })
    }

    const token = crypto.randomBytes(32).toString('hex')
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

    await db.emailVerificationToken.deleteMany({ where: { email } })
    await db.emailVerificationToken.create({
      data: {
        email,
        tokenHash,
        expiresAt,
      },
    })

    await sendVerificationEmail(email, token)

    return okResponse({ sent: true })
  })
}
