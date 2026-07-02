'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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

// Always show the Google button — if Google OAuth isn't configured on the
// server, next-auth will show an error page when clicked, but the
// email/password form always works. This avoids depending on getProviders().
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
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)
  const [notice, setNotice] = useState<{ status: string | null; error: string | null }>({ status: null, error: null })

  // Read URL params in useEffect (avoids useSearchParams which requires Suspense
  // and can cause the form to hang in "Loading" state if hydration fails).
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search)
      const verified = params.get('verified')
      const routeError = params.get('error')
      setNotice(routeNotice(verified, routeError))
    } catch {
      // ignore
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Checking your account...')

    try {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = safeCallbackPath(params.get('callbackUrl'))

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

      // Hard navigation for reliability — router.push can silently fail
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
    setStatusMessage('Redirecting to Google...')
    try {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = safeCallbackPath(params.get('callbackUrl'))
      await signIn('google', { callbackUrl })
    } catch {
      setError('Google sign in failed. Please try again.')
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

// No Suspense wrapper — the form renders immediately on the client.
// This eliminates the "Loading secure sign-in" hang that was caused by
// useSearchParams() requiring Suspense + getProviders() hanging on 500.
export default function SignInPage() {
  return <SignInForm />
}
