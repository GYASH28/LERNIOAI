'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, LogIn, Mail } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
} from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

type SignInFormProps = {
  callbackPath: string
  verified: string | null
  routeError: string | null
}

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

export function SignInForm({ callbackPath, verified, routeError }: SignInFormProps) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const notice = routeNotice(verified, routeError)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Checking your account...')

    try {
      const callbackUrl = new URL(callbackPath, window.location.origin).toString()
      const { signIn } = await import('next-auth/react')
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setSubmitting(false)
        setStatusMessage('')
        setError('Invalid email or password.')
        return
      }

      const destination = result?.url
        ? new URL(result.url, window.location.origin).toString()
        : callbackUrl

      try {
        const userResponse = await fetch('/api/user', { cache: 'no-store' })
        const userPayload = await userResponse.json().catch(() => null)
        if (userPayload?.ok && userPayload.data?.role) {
          const roleRedirects: Record<string, string> = {
            admin: '/admin',
            cr: '/cr',
          }
          const roleDestination = roleRedirects[userPayload.data.role]
          if (roleDestination) {
            window.location.assign(roleDestination)
            return
          }
        }
      } catch {
        // Role lookup is an optimization only; the validated callback remains safe.
      }

      window.location.assign(destination)
    } catch {
      setSubmitting(false)
      setStatusMessage('')
      setError('Sign in failed. Please try again.')
    }
  }

  const visibleError = error ?? notice.error
  const visibleStatus = statusMessage || notice.status

  return (
    <AuthShell
      eyebrow="Welcome back"
      title="Sign in to Lernio"
      description="Use your student profile or invited campus role."
      backHref="/"
      backLabel="Intro"
    >
      <form onSubmit={submit} className="space-y-4" noValidate={false}>
        <label className="block">
          <Label htmlFor="email" className="text-sm font-semibold text-foreground">
            Email
          </Label>
          <span className="relative mt-2 block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              name="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="student@lernio.ai"
              autoComplete="email"
              inputMode="email"
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
            <LockKeyhole className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" aria-hidden="true" />
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
          <p role="alert" className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            {visibleError}
          </p>
        ) : null}

        {visibleStatus ? (
          <p role="status" className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
            {visibleStatus}
          </p>
        ) : null}

        <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting} aria-busy={submitting}>
          <LogIn className="h-4 w-4" aria-hidden="true" />
          {submitting ? 'Signing in...' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        New to Lernio?{' '}
        <Link href="/sign-up" className="font-bold text-primary hover:text-foreground">
          Create a profile
        </Link>
      </p>
    </AuthShell>
  )
}
