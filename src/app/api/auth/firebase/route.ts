import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyFirebaseToken } from '@/lib/firebase/admin'
import { normalizeRole } from '@/lib/roles'
import { signJwt } from '@/lib/auth-jwt'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}))
    const { idToken } = body
    if (!idToken) {
      return NextResponse.json({ ok: false, error: { message: 'Missing idToken' } }, { status: 400 })
    }

    const firebaseUser = await verifyFirebaseToken(idToken)
    if (!firebaseUser?.email) {
      return NextResponse.json({ ok: false, error: { message: 'Invalid token' } }, { status: 401 })
    }

    let user = null
    try {
      user = await db.user.findUnique({ where: { email: firebaseUser.email.toLowerCase() } })
      if (!user) {
        user = await db.user.create({
          data: {
            email: firebaseUser.email.toLowerCase(),
            name: firebaseUser.name || firebaseUser.email.split('@')[0],
            role: 'student',
            status: 'active',
            provider: 'google',
            profileComplete: true,
            emailVerified: new Date(),
            preferredLang: 'en',
            dailyMins: 120,
            xp: 0,
            level: 1,
            streak: 0,
            image: firebaseUser.picture || null,
          },
        })
      } else if (user.status === 'disabled') {
        return NextResponse.json({ ok: false, error: { message: 'Account disabled' } }, { status: 403 })
      }
    } catch (dbErr) {
      console.error('[firebase-callback] DB error:', dbErr)
      return NextResponse.json({ ok: false, error: { message: 'Database error' } }, { status: 500 })
    }

    const token = await signJwt({
      id: user.id,
      email: user.email,
      name: user.name,
      role: normalizeRole(user.role),
      status: user.status,
      profileComplete: user.profileComplete,
      authorityVersion: user.authorityVersion ?? 0,
    })

    const isProduction = process.env.NODE_ENV === 'production'
    const cookieName = isProduction ? '__Secure-next-auth.session-token' : 'next-auth.session-token'
    const response = NextResponse.json({
      ok: true,
      data: { id: user.id, email: user.email, name: user.name, role: normalizeRole(user.role) },
    })
    response.cookies.set(cookieName, token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    })
    return response
  } catch (err) {
    console.error('[firebase-callback] Error:', err)
    return NextResponse.json({ ok: false, error: { message: 'Internal server error' } }, { status: 500 })
  }
}
