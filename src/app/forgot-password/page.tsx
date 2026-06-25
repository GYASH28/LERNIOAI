'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { Mail } from 'lucide-react'
import { AuthShell, authInputClass, authPrimaryButtonClass } from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Sending reset link...')

    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      })
      const data = await res.json()
      setSubmitting(false)
      setStatusMessage('')

      if (!res.ok || !data.ok) {
        setError(data.error || 'Could not request a reset link.')
      } else {
        setStatusMessage('If an account exists, a reset link has been sent or logged for this environment.')
      }
    } catch {
      setSubmitting(false)
      setStatusMessage('')
      setError('Could not request a reset link. Please try again.')
    }
  }

  return (
    <AuthShell
      eyebrow="Password recovery"
      title="Reset your password"
      description="Enter your account email and Lernio will create a time-limited reset link."
      backHref="/sign-in"
      backLabel="Sign in"
    >
      <form onSubmit={submit} className="space-y-4">
        <label className="block">
          <Label htmlFor="email" className="text-sm font-semibold text-[#405249]">
            Email
          </Label>
          <span className="relative mt-2 block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718176]" />
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

        <Button type="submit" className={`w-full ${authPrimaryButtonClass}`} disabled={submitting}>
          {submitting ? 'Sending...' : 'Send reset link'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-[#66776d]">
        Remembered it?{' '}
        <Link href="/sign-in" className="font-bold text-[#255f51] hover:text-[#17211c]">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
