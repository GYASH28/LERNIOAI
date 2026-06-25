import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { sendPasswordResetEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit forgot password requests
    const limiter = await checkRateLimit({
      action: 'forgot_password_request',
      identifier: normalizedEmail,
      limit: 3, // Max 3 requests per 15 minutes
      windowMs: 15 * 60 * 1000,
    });
    if (!limiter.allowed) {
      return NextResponse.json(
        { ok: false, error: 'Too many requests. Please try again later.' },
        { status: 429 }
      );
    }

    const user = await db.user.findUnique({
      where: { email: normalizedEmail },
      select: { id: true, status: true },
    });

    if (!user || user.status === 'disabled') {
      // Don't reveal if user exists or not for security reasons
      return NextResponse.json({ ok: true });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry

    // Delete any old unused tokens for this email
    await db.passwordResetToken.deleteMany({
      where: { email: normalizedEmail },
    });

    await db.passwordResetToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    await sendPasswordResetEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[forgot-password] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
