'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { CheckCircle2, ChevronDown, Mail, RefreshCw, UserPlus } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
} from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  inviteCode: '',
}

function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <label className={`block ${className}`}>
      <Label className="text-sm font-semibold text-foreground">{label}</Label>
      <span className="mt-2 block">{children}</span>
    </label>
  )
}

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm)
  const [showInvite, setShowInvite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  const [createdEmail, setCreatedEmail] = useState('')
  const [resending, setResending] = useState(false)

  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Enter your full name.'
    if (!form.email.trim()) return 'Enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
    if (form.password.length < 8) return 'Password must be at least 8 characters.'
    if (form.password !== form.confirmPassword) return 'Passwords do not match.'
    return ''
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const validation = validate()
    if (validation) {
      setError(validation)
      return
    }

    setSubmitting(true)
    setError('')
    setStatusMessage('Creating your account...')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          inviteCode: showInvite ? form.inviteCode.trim() : '',
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message || 'Could not create this account.')
      }

      const email = form.email.trim().toLowerCase()
      setCreatedEmail(email)
      setStatusMessage('')
      setForm(initialForm)
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Could not create this account.')
      setStatusMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  async function resendVerification() {
    if (!createdEmail || resending) return
    setResending(true)
    setError('')
    setStatusMessage('Sending a fresh verification link...')
    try {
      const response = await fetch('/api/auth/verify-email/request', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: createdEmail }),
      })
      const json = await response.json().catch(() => null)
      if (!response.ok || !json?.ok) {
        throw new Error(json?.error?.message || 'Could not resend the verification email.')
      }
      setStatusMessage('Verification email sent. Check your inbox and spam folder.')
    } catch (resendError) {
      setError(resendError instanceof Error ? resendError.message : 'Could not resend the verification email.')
      setStatusMessage('')
    } finally {
      setResending(false)
    }
  }

  if (createdEmail) {
    return (
      <AuthShell
        eyebrow="Verify email"
        title="Check your inbox"
        description="Your Lernio account is created, but it stays locked until you verify the email address."
        backHref="/"
        backLabel="Intro"
      >
        <div className="text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-emerald-500/10 text-emerald-600">
            <CheckCircle2 className="h-7 w-7" />
          </span>
          <p className="mt-5 text-sm leading-6 text-muted-foreground">
            We sent a verification link to <strong className="text-foreground">{createdEmail}</strong>.
            Open it first, then sign in and complete your Class 11/12/JEE academic setup.
          </p>
          <div className="mt-6 grid gap-3">
            <Link href="/sign-in" className={`inline-flex items-center justify-center ${authPrimaryButtonClass}`}>
              Go to sign in
            </Link>
            <Button
              type="button"
              variant="outline"
              className={`w-full ${authSecondaryButtonClass}`}
              onClick={resendVerification}
              disabled={resending}
            >
              <RefreshCw className={`h-4 w-4 ${resending ? 'animate-spin' : ''}`} />
              {resending ? 'Sending...' : 'Resend verification email'}
            </Button>
          </div>
          {statusMessage ? (
            <p className="mt-4 rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary">
              {statusMessage}
            </p>
          ) : null}
          {error ? (
            <p className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive">
              {error}
            </p>
          ) : null}
        </div>
      </AuthShell>
    )
  }

  return (
    <AuthShell
      eyebrow="Create account"
      title="Start your Lernio workspace"
      description="Create and verify your account first. Next, Lernio will ask for your class, stream, board/JEE goal, daily target and weak subjects."
      backHref="/"
      backLabel="Intro"
      className="max-w-xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2">
          <Input name="name" value={form.name} onChange={handleChange} placeholder="Your name" autoComplete="name" className={authInputClass} required />
        </Field>

        <Field label="Email" className="sm:col-span-2">
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input type="email" name="email" value={form.email} onChange={handleChange} placeholder="you@example.com" autoComplete="email" className={`${authInputClass} pl-10`} required />
          </span>
        </Field>

        <Field label="Password">
          <Input type="password" name="password" value={form.password} onChange={handleChange} placeholder="At least 8 characters" autoComplete="new-password" className={authInputClass} required />
          {form.password.length > 0 ? (
            <div className="mt-1.5 flex items-center gap-2">
              <div className="flex h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
                <div className={`h-full transition-all duration-300 ${form.password.length < 4 ? 'w-1/4 bg-red-500' : form.password.length < 8 ? 'w-1/2 bg-amber-500' : form.password.length < 12 ? 'w-3/4 bg-blue-500' : 'w-full bg-emerald-500'}`} />
              </div>
              <span className={`text-[10px] font-medium ${form.password.length < 4 ? 'text-red-500' : form.password.length < 8 ? 'text-amber-500' : form.password.length < 12 ? 'text-blue-500' : 'text-emerald-500'}`}>
                {form.password.length < 4 ? 'Weak' : form.password.length < 8 ? 'Fair' : form.password.length < 12 ? 'Good' : 'Strong'}
              </span>
            </div>
          ) : null}
        </Field>

        <Field label="Confirm password">
          <Input type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="Repeat password" autoComplete="new-password" className={authInputClass} required />
        </Field>

        <div className="sm:col-span-2">
          <button type="button" className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-muted" onClick={() => setShowInvite((value) => !value)} aria-expanded={showInvite}>
            {showInvite ? 'Hide invite code' : 'Have a staff invite code?'}
            <ChevronDown className={`h-4 w-4 transition ${showInvite ? 'rotate-180' : ''}`} />
          </button>
        </div>

        {showInvite ? (
          <Field label="Invite code" className="sm:col-span-2">
            <Input name="inviteCode" value={form.inviteCode} onChange={(event) => setForm((current) => ({ ...current, inviteCode: event.target.value.toUpperCase() }))} placeholder="LERNIO-ROLE-XXXXXX" className={authInputClass} />
          </Field>
        ) : null}

        {error ? <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive sm:col-span-2">{error}</p> : null}
        {statusMessage ? <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary sm:col-span-2">{statusMessage}</p> : null}

        <Button type="submit" className={`w-full sm:col-span-2 ${authPrimaryButtonClass}`} disabled={submitting}>
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Creating account...' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already verified?{' '}
        <Link href="/sign-in" className="font-bold text-primary hover:text-foreground">Sign in</Link>
      </p>
    </AuthShell>
  )
}
