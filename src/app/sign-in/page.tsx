'use client'

import Link from 'next/link'
import { Suspense, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
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
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'))
  const verified = searchParams.get('verified')
  const routeError = searchParams.get('error')
  const notice = useMemo(() => routeNotice(verified, routeError), [verified, routeError])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }> | null>(null)

  useEffect(() => {
    let mounted = true
    getProviders().then((items) => {
      if (mounted) setProviders(items)
    })
    return () => {
      mounted = false
    }
  }, [])

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Checking your account...')

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

    router.push(result?.url ?? callbackUrl)
    router.refresh()
  }

  async function handleOAuthSignIn(provider: string) {
    setOauthLoading(provider)
    setError(null)
    setStatusMessage('Redirecting to Google...')
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setError('Google sign in failed. Please try again.')
      setOauthLoading(null)
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

        <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting || !!oauthLoading}>
          <LogIn className="h-4 w-4" />
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      {providers?.google ? (
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
            disabled={submitting || !!oauthLoading}
            onClick={() => handleOAuthSignIn('google')}
          >
            {oauthLoading === 'google' ? (
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
  return (
    <Suspense
      fallback={
        <AuthShell
          eyebrow="Welcome back"
          title="Sign in to Lernio"
          description="Loading secure sign-in."
          backHref="/"
          backLabel="Intro"
        >
          <div className="h-72 animate-pulse rounded-lg bg-muted" />
        </AuthShell>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
