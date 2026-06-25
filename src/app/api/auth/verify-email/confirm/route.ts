import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import crypto from 'crypto';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get('token');
  const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';

  if (!token) {
    return NextResponse.redirect(new URL('/sign-in?verified=false&error=missing_token', baseUrl));
  }

  try {
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    const dbToken = await db.emailVerificationToken.findUnique({
      where: { tokenHash },
    });

    if (!dbToken || dbToken.expiresAt <= new Date() || dbToken.usedAt) {
      return NextResponse.redirect(new URL('/sign-in?verified=false&error=expired_or_invalid', baseUrl));
    }

    // Flag user as emailVerified and mark token as used
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { email: dbToken.email },
        data: { emailVerified: new Date() },
      });

      await tx.emailVerificationToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      });
    });

    return NextResponse.redirect(new URL('/sign-in?verified=true', baseUrl));
  } catch (error) {
    console.error('[verify-email/confirm] error:', error);
    return NextResponse.redirect(new URL('/sign-in?verified=false&error=server_error', baseUrl));
  }
}
