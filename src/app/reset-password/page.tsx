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

function Rule({ passed, children }: { passed: boolean; children: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {passed ? <Check className="h-3.5 w-3.5 text-[#255f51]" /> : <X className="h-3.5 w-3.5 text-[#9aa8a0]" />}
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

  const hasLength = password.length >= 8
  const hasUpper = /[A-Z]/.test(password)
  const hasLower = /[a-z]/.test(password)
  const hasNumber = /[0-9]/.test(password)
  const hasSpecial = /[^A-Za-z0-9]/.test(password)
  const isMatch = password === confirmPassword && password.length > 0
  const strengthCount = [hasLength, hasUpper, hasLower, hasNumber, hasSpecial].filter(Boolean).length
  const strengthLabel = strengthCount >= 5 ? 'Strongest' : strengthCount >= 4 ? 'Strong' : strengthCount >= 3 ? 'Good' : strengthCount >= 2 ? 'Weak' : 'Very weak'

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!token) {
      setError('The reset link is missing its token.')
      return
    }

    if (strengthCount < 3) {
      setError('Use at least 3 password rules.')
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
        setError(data.error || 'Could not reset the password.')
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
          <p className="rounded-lg border border-[#e7b7b7] bg-[#fff1f1] px-3 py-2 text-sm font-semibold text-[#8a2d2d]">
            This reset link is invalid or missing a token. Request a new link to continue.
          </p>
          <Button asChild className={`w-full ${authPrimaryButtonClass}`}>
            <Link href="/forgot-password">Request a new link</Link>
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} className="space-y-4">
          <div>
            <Label htmlFor="password" className="text-sm font-semibold text-[#405249]">
              New password
            </Label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718176]" />
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="Minimum 8 characters"
                required
                className={`${authInputClass} pl-10 pr-11`}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                onClick={() => setShowPassword((value) => !value)}
                className="absolute right-3.5 top-1/2 grid h-6 w-6 -translate-y-1/2 place-items-center rounded-md text-[#718176] transition hover:bg-[#eef3ef] hover:text-[#17211c]"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-sm font-semibold text-[#405249]">
              Confirm password
            </Label>
            <div className="relative mt-2">
              <KeyRound className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718176]" />
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
            <div className="rounded-lg border border-[#d7e1da] bg-[#f7faf8] p-3">
              <div className="flex items-center justify-between text-xs font-semibold">
                <span className="text-[#405249]">Strength: {strengthLabel}</span>
                <span className="text-[#718176]">{strengthCount}/5 rules met</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-[#d7e1da]">
                <div className="h-full rounded-full bg-[#255f51] transition-all duration-300" style={{ width: `${(strengthCount / 5) * 100}%` }} />
              </div>
              <ul className="mt-3 grid gap-1.5 text-xs font-semibold text-[#66776d]">
                <Rule passed={hasLength}>At least 8 characters</Rule>
                <Rule passed={hasUpper}>One uppercase letter</Rule>
                <Rule passed={hasLower}>One lowercase letter</Rule>
                <Rule passed={hasNumber}>One number</Rule>
                <Rule passed={hasSpecial}>One special character</Rule>
                <Rule passed={isMatch}>Passwords match</Rule>
              </ul>
            </div>
          ) : null}

          {error ? (
            <p className="rounded-lg border border-[#e7b7b7] bg-[#fff1f1] px-3 py-2 text-sm font-semibold text-[#8a2d2d]">
              {error}
            </p>
          ) : null}

          {statusMessage ? (
            <p className="rounded-lg border border-[#bad8cb] bg-[#eef8f2] px-3 py-2 text-sm font-semibold text-[#255f51]">
              {statusMessage}
            </p>
          ) : null}

          <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting || !isMatch || strengthCount < 3}>
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
          <div className="h-72 animate-pulse rounded-lg bg-[#eef3ef]" />
        </AuthShell>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
