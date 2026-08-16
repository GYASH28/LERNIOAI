import crypto from 'crypto'
import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const token = searchParams.get('token')
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000'

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in?verified=false&error=missing_token', baseUrl))
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex')
    const dbToken = await db.emailVerificationToken.findUnique({ where: { tokenHash } })

    if (!dbToken || dbToken.expiresAt <= new Date() || dbToken.usedAt) {
      return NextResponse.redirect(new URL('/sign-in?verified=false&error=expired_or_invalid', baseUrl))
    }

    const activated = await db.$transaction(async (tx) => {
      const updated = await tx.user.updateMany({
        where: {
          email: dbToken.email,
          provider: 'password',
          status: 'pending_verification',
          emailVerified: null,
        },
        data: {
          emailVerified: new Date(),
          status: 'active',
          authorityVersion: { increment: 1 },
        },
      })

      if (updated.count !== 1) return false

      await tx.emailVerificationToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      })
      return true
    })

    if (!activated) {
      return NextResponse.redirect(new URL('/sign-in?verified=false&error=expired_or_invalid', baseUrl))
    }

    return NextResponse.redirect(new URL('/sign-in?verified=true', baseUrl))
  } catch (error) {
    console.error('[verify-email/confirm] error:', error)
    return NextResponse.redirect(new URL('/sign-in?verified=false&error=server_error', baseUrl))
  }
}
