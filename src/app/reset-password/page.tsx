'use client'

import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Suspense, useState } from 'react'
import type { FormEvent } from 'react'
import { Check, Eye, EyeOff, KeyRound, X } from 'lucide-react'
import { AuthShell, authInputClass, authPrimaryButtonClass } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

function getErrorMessage(payload: unknown, fallback: string): string {
  if (!payload || typeof payload !== 'object') return fallback
  const error = (payload as { error?: unknown }).error
  if (typeof error === 'string') return error
  if (error && typeof error === 'object') {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string') return message
  }
  return fallback
}

function Rule({ passed, children }: { passed: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {passed ? <Check className="h-3.5 w-3.5 text-success" /> : <X className="h-3.5 w-3.5 text-muted-foreground" />}
      <span>{children}</span>
    </li>
  )
}

function ResetPasswordForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get('token')

  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const hasLength = password.length >= 12
  const hasLongPassphrase = password.trim().length >= 16
  const hasLetter = /[A-Za-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const isMatch = password === confirmPassword && password.length > 0
  const passesPolicy = hasLongPassphrase || (hasLength && hasLetter && hasNumber)
  const strengthCount = [hasLength, hasLongPassphrase, hasLetter, hasNumber].filter(Boolean).length
  const strengthLabel = hasLongPassphrase && isMatch ? 'Strong passphrase' : passesPolicy ? 'Good' : 'Too weak'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setError('The reset link is missing its token.')
      return
    }

    if (!passesPolicy) {
      setError('Use at least 12 characters with a letter and number, or a longer passphrase.')
      return
    }

    if (!isMatch) {
      setError('Passwords do not match.')
      return
    }

    setSubmitting(true)
    setError(null)
    setStatusMessage('Updating your password...')

    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password }),
      })
      const data = await res.json()
      setSubmitting(false)
      setStatusMessage('')

      if (!res.ok || !data.ok) {
        setError(getErrorMessage(data, 'Could not reset the password.'))
      } else {
        setStatusMessage('Password updated. Redirecting to sign in...')
        setTimeout(() => {
          router.push('/sign-in')
        }, 1600)
      }
    } catch {
      setSubmitting(false)
      setStatusMessage('')
      setError('Could not reset the password. Please try again.')
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Choose a new password"
      description="Use a password that is long enough and not reused from another account."
      backHref="/sign-in"
      backLabel="Sign in"
    >
      {!token ? (
        <div className="space-y-4">
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
            This reset link is invalid or missing a token. Request a new link to continue.
          </p>
          <Button asChild className={`w-full ${authPrimaryButtonClass}`}>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-semibold text-foreground">
              New password
            </Label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="12+ characters or a long passphrase"
                required
                className={`${authInputClass} pl-10 pr-11`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-semibold text-foreground">
              Confirm password
            </Label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                id="confirmPassword"
                type={showPassword ? 'text' : 'password'}
                name="confirmPassword"
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                placeholder="Re-enter password"
                required
                className={`${authInputClass} pl-10`}
              />
            </div>
          </div>

          {password.length > 0 ? (
            <div className="rounded-lg border border-border bg-muted/60 p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-foreground">Strength: {strengthLabel}</span>
                <span className="text-muted-foreground">{passesPolicy ? 'Meets policy' : 'Needs more strength'}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-border">
                <div className="h-full rounded-full bg-primary transition-all duration-300" style={{ width: `${Math.max(15, (strengthCount / 4) * 100)}%` }} />
              </div>
              <ul className="mt-3 grid gap-1.5 text-xs font-semibold text-muted-foreground">
                <Rule passed={hasLength}>At least 12 characters</Rule>
                <Rule passed={hasLetter}>Contains a letter</Rule>
                <Rule passed={hasNumber}>Contains a number</Rule>
                <Rule passed={hasLongPassphrase}>Or use a 16+ character passphrase</Rule>
                <Rule passed={isMatch}>Passwords match</Rule>
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}

          {statusMessage ? (
            <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {statusMessage}
            </p>
          ) : null}

          <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting || !isMatch || !passesPolicy}>
            {submitting ? 'Resetting...' : 'Reset password'}
          </Button>
        </form>
      )}
    </AuthShell>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          eyebrow="Password recovery"
          title="Choose a new password"
          description="Loading reset form."
          backHref="/sign-in"
          backLabel="Sign in"
        >
          <div className="h-72 animate-pulse rounded-lg bg-muted" />
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
