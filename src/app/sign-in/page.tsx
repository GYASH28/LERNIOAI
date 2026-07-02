'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, LogIn, Mail } from 'lucide-react'
import {
  AuthShell,
  GoogleMark,
  authInputClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeCallbackPath } from '@/lib/auth-policy'
import { getCampusDashboardPath } from '@/lib/campus-auth'

const GOOGLE_ENABLED = true

function routeNotice(verified: string | null, error: string | null) {
  if (verified === 'true') {
    return { status: 'Email verified. You can sign in now.', error: null }
  }
  if (verified === 'false') {
    const message =
      error === 'missing_token'
        ? 'The verification link is missing its token.'
        : error === 'server_error'
          ? 'We could not verify that email. Try the link again.'
          : 'The verification link is invalid or expired.'
    return { status: null, error: message }
  }
  if (!error) return { status: null, error: null }
  return {
    status: null,
    error: error === 'CredentialsSignin'
      ? 'Invalid email or password.'
      : 'Your session could not be verified. Please sign in again.',
  }
}

function SignInForm() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [notice, setNotice] = useState<{ status: string | null; error: string | null }>({ status: null, error: null })

  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const verified = params.get('verified')
      const routeError = params.get('error')
      setNotice(routeNotice(verified, routeError))
    } catch {}
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Checking your account...')

    try {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = safeCallbackPath(params.get('callbackUrl'))

      // Lazy import to avoid loading next-auth on page render
      const { signIn } = await import('next-auth/react')
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      })

      setSubmitting(false)
      setStatusMessage('')

      if (result?.error) {
        setError('Invalid email or password.')
        return
      }

      let destination = result?.url ?? callbackUrl
      try {
        const path = destination.startsWith('http') ? new URL(destination).pathname : destination
        if (path === '/dashboard') {
          const response = await fetch('/api/user', { cache: 'no-store' })
          const payload = await response.json().catch(() => null)
          if (payload?.ok && payload.data?.role) {
            destination = getCampusDashboardPath(payload.data.role)
          }
        }
      } catch {
        destination = callbackUrl
      }

      window.location.href = destination
    } catch {
      setSubmitting(false)
      setStatusMessage('')
      setError('Sign in failed. Please try again.')
    }
  }

  async function handleGoogleSignIn() {
    setOauthLoading(true)
    setError(null)
    setStatusMessage('Opening Google sign-in...')

    try {
      const { getFirebaseAuth, isFirebaseConfigured } = await import('@/lib/firebase/client')

      if (!isFirebaseConfigured()) {
        setError('Google sign-in is not configured. Please use email/password.')
        setOauthLoading(false)
        setStatusMessage('')
        return
      }

      const firebaseAuth = getFirebaseAuth()
      if (!firebaseAuth) {
        setError('Google sign-in is not available. Please use email/password.')
        setOauthLoading(false)
        setStatusMessage('')
        return
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      setStatusMessage('Waiting for Google...')
      const result = await signInWithPopup(firebaseAuth, provider)
      const idToken = await result.user.getIdToken()

      setStatusMessage('Signing you in...')
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || 'Failed to sign in')
      }

      const params = new URLSearchParams(window.location.search)
      let destination = safeCallbackPath(params.get('callbackUrl'))

      if (destination === '/dashboard') {
        try {
          const userResponse = await fetch('/api/user', { cache: 'no-store' })
          const userPayload = await userResponse.json().catch(() => null)
          if (userPayload?.ok && userPayload.data?.role) {
            destination = getCampusDashboardPath(userPayload.data.role)
          }
        } catch {}
      }

      window.location.href = destination
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed'
      if (message.includes('popup') || message.includes('cancelled')) {
        setError('Google sign-in was cancelled.')
      } else if (message.includes('configuration-not-found')) {
        setError('Google sign-in is not configured. Please use email/password.')
      } else {
        setError(message || 'Google sign in failed. Please try again.')
      }
      setOauthLoading(false)
      setStatusMessage('')
    }
  }

  const visibleError = error ?? notice.error
  const visibleStatus = statusMessage || notice.status

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Lernio"
      description="Use your student profile, invited campus role, or connected Google account."
      backHref="/"
      backLabel="Intro"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email
          </Label>
          <span className="relative mt-2 block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@lernio.ai"
              autoComplete="email"
              required
              className={`${authInputClass} pl-10`}
            />
          </span>
        </label>

        <div>
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              Password
            </Label>
            <Link href="/forgot-password" className="text-xs font-bold text-primary transition hover:text-foreground">
              Forgot password?
            </Link>
          </div>
          <span className="relative mt-2 block">
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="password"
              type="password"
              name="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Your password"
              autoComplete="current-password"
              required
              className={`${authInputClass} pl-10`}
            />
          </span>
        </div>

        {visibleError ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {visibleError}
          </p>
        ) : null}

        {visibleStatus ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {visibleStatus}
          </p>
        ) : null}

        <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting || oauthLoading}>
          <LogIn className="h-4 w-4" />
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {GOOGLE_ENABLED ? (
        <div>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button
            type="button"
            variant="secondary"
            className={`w-full ${authSecondaryButtonClass}`}
            disabled={submitting || oauthLoading}
            onClick={handleGoogleSignIn}
          >
            {oauthLoading ? (
              <span className="h-4 w-4 animate-spin rounded-full border-2 border-muted-foreground/30 border-t-primary" />
            ) : (
              <GoogleMark />
            )}
            Continue with Google
          </Button>
        </div>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Lernio?{' '}
        <Link href="/sign-up" className="font-bold text-primary hover:text-foreground">
          Create a profile
        </Link>
      </p>
    </AuthShell>
  )
}

export default function SignInPage() {
  return <SignInForm />
}
