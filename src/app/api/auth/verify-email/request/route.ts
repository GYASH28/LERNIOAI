import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';
import { sendVerificationEmail } from '@/lib/email';
import { checkRateLimit } from '@/lib/rate-limit';
import crypto from 'crypto';

export async function POST(req: Request) {
  try {
    const authUser = await getCurrentUser();
    let email: string;

    if (authUser) {
      email = authUser.email;
    } else {
      const body = await req.json().catch(() => ({}));
      email = body.email;
    }

    if (!email || typeof email !== 'string') {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const normalizedEmail = email.trim().toLowerCase();

    // Rate limit resend requests
    const limiter = await checkRateLimit({
      action: 'verify_email_request',
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
      select: { id: true, emailVerified: true },
    });

    if (!user) {
      return NextResponse.json({ ok: true });
    }

    if (user.emailVerified) {
      return NextResponse.json({ ok: true, message: 'Email is already verified.' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours expiry

    await db.emailVerificationToken.deleteMany({
      where: { email: normalizedEmail },
    });

    await db.emailVerificationToken.create({
      data: {
        email: normalizedEmail,
        tokenHash,
        expiresAt,
      },
    });

    await sendVerificationEmail(normalizedEmail, token);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('[verify-email/request] error:', error);
    return NextResponse.json({ ok: false, error: 'Internal server error' }, { status: 500 });
  }
}
