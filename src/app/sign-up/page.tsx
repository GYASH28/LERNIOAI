'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ChevronDown, Mail, UserPlus } from 'lucide-react'
import {
  AuthShell,
  GoogleMark,
  authInputClass,
  authPrimaryButtonClass,
  authSecondaryButtonClass,
  authSelectClass,
} from '@/components/auth/auth-shell'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { CAMPUS_DIVISIONS, CAMPUS_SEMESTERS, CWIT_PROGRAMMES } from '@/lib/campus-auth'

const initialForm = {
  name: '',
  email: '',
  password: '',
  confirmPassword: '',
  rollNumber: '',
  departmentCode: '',
  semesterNumber: '',
  division: 'NOT_SURE',
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

function ToggleSection({
  open,
  onClick,
  children,
}: {
  open: boolean
  onClick: () => void
  children: ReactNode
}) {
  return (
    <button
      type="button"
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted px-3 py-2 text-sm font-bold text-primary transition hover:border-strong hover:bg-background"
      onClick={onClick}
      aria-expanded={open}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

function SignUpForm() {
  const [form, setForm] = useState(initialForm)
  const [showAcademic, setShowAcademic] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
  // Always enable Google — avoids depending on getProviders() API call.
  const [providers, setProviders] = useState<Record<string, { id: string; name: string }>>({ google: { id: 'google', name: 'Google' } })

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Enter your full name.'
    if (!form.email.trim()) return 'Enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
    if (form.rollNumber.trim() && !/^[A-Za-z0-9/-]{1,32}$/.test(form.rollNumber.trim())) return 'Roll number format is not valid.'
    const longPassphrase = form.password.trim().length >= 16
    const mixedShortPassword = form.password.length >= 12 && /[A-Za-z]/.test(form.password) && /\d/.test(form.password)
    if (!longPassphrase && !mixedShortPassword) {
      return 'Use at least 12 characters with a letter and number, or a longer passphrase.'
    }
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
    setStatusMessage(showInvite && form.inviteCode.trim() ? 'Checking invite code...' : 'Creating your profile...')

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          email: form.email.trim(),
          password: form.password,
          rollNumber: form.rollNumber.trim(),
          departmentCode: form.departmentCode || undefined,
          semesterNumber: form.semesterNumber ? Number(form.semesterNumber) : undefined,
          division: form.division,
          inviteCode: showInvite ? form.inviteCode.trim() : '',
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message || 'Could not create this account.')
      }

      setForm(initialForm)
      setStatusMessage('Profile created. Check your email to verify the account before signing in.')
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Could not create this account.')
      setStatusMessage('')
    } finally {
      setSubmitting(false)
    }
  }

  async function handleGoogle() {
    setSubmitting(true)
    setError('')
    setStatusMessage('Opening Google sign-in...')

    try {
      const { getFirebaseAuth, isFirebaseConfigured } = await import('@/lib/firebase/client')

      if (!isFirebaseConfigured()) {
        setError('Google sign-in is not configured. Please use email/password.')
        setStatusMessage('')
        setSubmitting(false)
        return
      }

      const firebaseAuth = getFirebaseAuth()
      if (!firebaseAuth) {
        setError('Google sign-in is not available. Please use email/password.')
        setStatusMessage('')
        setSubmitting(false)
        return
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      setStatusMessage('Waiting for Google...')
      const result = await signInWithPopup(firebaseAuth, provider)
      const idToken = await result.user.getIdToken()

      setStatusMessage('Creating your profile...')
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || 'Failed to sign in')
      }

      window.location.href = '/complete-profile'
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed'
      if (message.includes('popup') || message.includes('cancelled')) {
        setError('Google sign-in was cancelled.')
      } else {
        setError(message || 'Google sign in failed. Please try again.')
      }
      setStatusMessage('')
      setSubmitting(false)
    }
  }

  return (
    <AuthShell
      eyebrow="Create profile"
      title="Start with a student account"
      description="Students can sign up directly. CR, teacher, coordinator, reviewer, moderator, and admin access need an invite code."
      backHref="/"
      backLabel="Intro"
      className="max-w-2xl"
    >
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" className="sm:col-span-2">
          <Input
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Your name"
            autoComplete="name"
            className={authInputClass}
            required
          />
        </Field>

        <Field label="Email" className="sm:col-span-2">
          <span className="relative block">
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              autoComplete="email"
              className={`${authInputClass} pl-10`}
              required
            />
          </span>
        </Field>

        <Field label="Password">
          <Input
            type="password"
            name="password"
            value={form.password}
            onChange={handleChange}
            placeholder="12+ characters or a long passphrase"
            autoComplete="new-password"
            className={authInputClass}
            required
          />
        </Field>

        <Field label="Confirm password">
          <Input
            type="password"
            name="confirmPassword"
            value={form.confirmPassword}
            onChange={handleChange}
            placeholder="Repeat password"
            autoComplete="new-password"
            className={authInputClass}
            required
          />
        </Field>

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <ToggleSection open={showAcademic} onClick={() => setShowAcademic((value) => !value)}>
            {showAcademic ? 'Hide academic details' : 'Add academic details'}
          </ToggleSection>
          <ToggleSection open={showInvite} onClick={() => setShowInvite((value) => !value)}>
            {showInvite ? 'Hide invite code' : 'Have an invite code'}
          </ToggleSection>
        </div>

        {showAcademic ? (
          <div className="grid gap-4 rounded-lg border border-border bg-muted/60 p-4 sm:col-span-2 sm:grid-cols-2">
            <Field label="Roll number">
              <Input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="Optional"
                inputMode="text"
                pattern="[A-Za-z0-9/-]{1,32}"
                className={authInputClass}
              />
            </Field>
            <Field label="Department / programme">
              <select name="departmentCode" value={form.departmentCode} onChange={handleChange} className={authSelectClass}>
                <option value="">Choose later</option>
                {CWIT_PROGRAMMES.map((programme) => (
                  <option key={programme.programmeCode} value={programme.departmentCode}>
                    {programme.programmeName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Semester">
              <select name="semesterNumber" value={form.semesterNumber} onChange={handleChange} className={authSelectClass}>
                <option value="">Choose later</option>
                {CAMPUS_SEMESTERS.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Division">
              <select name="division" value={form.division} onChange={handleChange} className={authSelectClass}>
                {CAMPUS_DIVISIONS.map((division) => (
                  <option key={division} value={division}>
                    {division === 'NOT_SURE' ? 'Not sure' : `Division ${division}`}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        ) : null}

        {showInvite ? (
          <Field label="Invite code" className="sm:col-span-2">
            <Input
              name="inviteCode"
              value={form.inviteCode}
              onChange={(event) => setForm((current) => ({ ...current, inviteCode: event.target.value.toUpperCase() }))}
              placeholder="LM-TEA-123456"
              className={authInputClass}
            />
          </Field>
        ) : null}

        {error ? (
          <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm font-semibold text-destructive sm:col-span-2">
            {error}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2 text-sm font-semibold text-primary sm:col-span-2">
            {statusMessage}
          </p>
        ) : null}

        <Button type="submit" className={`w-full sm:col-span-2 ${authPrimaryButtonClass}`} disabled={submitting}>
          <UserPlus className="h-4 w-4" />
          {submitting ? 'Creating profile...' : 'Create profile'}
        </Button>
      </form>

      {providers?.google ? (
        <>
          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            or
            <span className="h-px flex-1 bg-border" />
          </div>
          <Button type="button" variant="secondary" className={`w-full ${authSecondaryButtonClass}`} disabled={submitting} onClick={handleGoogle}>
            <GoogleMark />
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-bold text-primary hover:text-foreground">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

// No Suspense wrapper — the form renders immediately.
export default function SignUpPage() {
  return <SignUpForm />
}
