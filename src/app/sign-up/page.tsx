'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { ChevronDown, Mail, UserPlus } from 'lucide-react'
import {
  AuthShell,
  authInputClass,
  authPrimaryButtonClass,
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
  division: '',
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
      className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/30 px-3 py-2 text-sm font-bold text-primary transition hover:border-primary/40 hover:bg-muted"
      onClick={onClick}
      aria-expanded={open}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm)
  const [showAcademic] = useState(true) // Always visible — academic details are mandatory
  const [showInvite, setShowInvite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Enter your full name.'
    if (!form.email.trim()) return 'Enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
    if (!form.departmentCode) return 'Select your department / programme.'
    if (!form.semesterNumber) return 'Select your current semester.'
    if (!form.division || form.division === 'NOT_SURE') return 'Select your division (A, B, or C).'
    if (!form.rollNumber.trim()) return 'Enter your 6-digit roll number.'
    if (!/^\d{6}$/.test(form.rollNumber.trim())) return 'Roll number must be exactly 6 digits (e.g. 255044).'
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
    setStatusMessage('Creating your profile...')

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

      // Auto sign-in after registration
      setStatusMessage('Signing you in...')
      const { signIn } = await import('next-auth/react')
      const callbackUrl = new URL('/dashboard', window.location.origin).toString()
      const result = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
        callbackUrl,
      })

      if (result?.error) {
        setError('Account created! Please sign in on the sign-in page.')
        setStatusMessage('')
        setSubmitting(false)
        return
      }

      window.location.href = result?.url || callbackUrl
    } catch (signupError) {
      setError(signupError instanceof Error ? signupError.message : 'Could not create this account.')
      setStatusMessage('')
    } finally {
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
            placeholder="At least 8 characters"
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
          <ToggleSection open={showInvite} onClick={() => setShowInvite((value) => !value)}>
            {showInvite ? 'Hide invite code' : 'Have an invite code'}
          </ToggleSection>
        </div>

        {/* Academic details — always visible, mandatory */}
        <div className="grid gap-4 rounded-lg border border-border bg-muted/20 p-4 sm:col-span-2 sm:grid-cols-2">
            <Field label="Roll number *">
              <Input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="e.g. 255044 (6 digits)"
                inputMode="numeric"
                pattern="[0-9]{6}"
                maxLength={6}
                className={authInputClass}
                required
              />
              <p className="mt-1 text-[10px] text-muted-foreground">Enter your official 6-digit roll number.</p>
            </Field>
            <Field label="Department / programme *">
              <select name="departmentCode" value={form.departmentCode} onChange={handleChange} className={authSelectClass} required>
                <option value="">Select department</option>
                {CWIT_PROGRAMMES.map((programme) => (
                  <option key={programme.programmeCode} value={programme.departmentCode}>
                    {programme.programmeName}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Semester *">
              <select name="semesterNumber" value={form.semesterNumber} onChange={handleChange} className={authSelectClass} required>
                <option value="">Select semester</option>
                {CAMPUS_SEMESTERS.map((semester) => (
                  <option key={semester} value={semester}>
                    Semester {semester}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Division *">
              <select name="division" value={form.division} onChange={handleChange} className={authSelectClass} required>
                <option value="">Select division</option>
                <option value="A">Division A</option>
                <option value="B">Division B</option>
                <option value="C">Division C</option>
              </select>
            </Field>
          </div>

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

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-bold text-primary hover:text-foreground">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}
