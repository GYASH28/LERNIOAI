import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { hash } from 'bcryptjs';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { token, password } = await req.json();
    if (!token || typeof token !== 'string' || !password || typeof password !== 'string' || password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input. Password must be at least 8 characters long.' },
        { status: 400 }
      );
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    // Find the token
    const dbToken = await db.passwordResetToken.findUnique({
      where: { tokenHash },
    });

    if (!dbToken || dbToken.expiresAt <= new Date() || dbToken.usedAt) {
      return NextResponse.json({ ok: false, error: 'Invalid or expired token.' }, { status: 400 });
    }

    // Rate limit reset password attempts per email
    const limiter = await checkRateLimit({
      action: 'reset_password_attempt',
      identifier: dbToken.email,
      limit: 5, // Max 5 attempts per 15 minutes
      windowMs: 15 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many attempts. Please try again later.' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: dbToken.email },
      select: { id: true, status: true },
    });

    if (!user || user.status === 'disabled') {
      return NextResponse.json({ ok: false, error: 'User account is inactive or disabled.' }, { status: 400 });
    }

    const passwordHash = await hash(password, 12);

    // Update password, mark token as used, and revoke sessions inside a transaction
    await db.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });

      await tx.passwordResetToken.update({
        where: { id: dbToken.id },
        data: { usedAt: new Date() },
      });

      await tx.session.deleteMany({
        where: { userId: user.id },
      });
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[reset-password] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
