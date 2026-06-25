'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import type { ChangeEvent, FormEvent, ReactNode } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
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
      <Label className="text-sm font-semibold text-[#405249]">{label}</Label>
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
      className="inline-flex items-center gap-2 rounded-lg border border-[#d7e1da] bg-[#f7faf8] px-3 py-2 text-sm font-bold text-[#255f51] transition hover:border-[#9db2a6] hover:bg-white"
      onClick={onClick}
      aria-expanded={open}
    >
      {children}
      <ChevronDown className={`h-4 w-4 transition ${open ? 'rotate-180' : ''}`} />
    </button>
  )
}

function SignUpForm() {
  const router = useRouter()
  const [form, setForm] = useState(initialForm)
  const [showAcademic, setShowAcademic] = useState(false)
  const [showInvite, setShowInvite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')
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

  function handleChange(event: ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Enter your full name.'
    if (!form.email.trim()) return 'Enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
    if (form.rollNumber.trim() && !/^[A-Za-z0-9/-]{1,32}$/.test(form.rollNumber.trim())) return 'Roll number format is not valid.'
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

      setStatusMessage('Signing you in...')
      const result = await signIn('credentials', {
        email: form.email.trim(),
        password: form.password,
        redirect: false,
        callbackUrl: '/dashboard',
      })
      if (result?.error) {
        throw new Error('Account created, but automatic sign-in failed. Use the sign-in page.')
      }

      router.push(result?.url ?? '/dashboard')
      router.refresh()
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
    setStatusMessage('Redirecting to Google...')
    try {
      await signIn('google', { callbackUrl: '/complete-profile' })
    } catch {
      setError('Google sign in failed. Please try again.')
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
            <Mail className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[#718176]" />
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
          <ToggleSection open={showAcademic} onClick={() => setShowAcademic((value) => !value)}>
            {showAcademic ? 'Hide academic details' : 'Add academic details'}
          </ToggleSection>
          <ToggleSection open={showInvite} onClick={() => setShowInvite((value) => !value)}>
            {showInvite ? 'Hide invite code' : 'Have an invite code'}
          </ToggleSection>
        </div>

        {showAcademic ? (
          <div className="grid gap-4 rounded-lg border border-[#d7e1da] bg-[#f7faf8] p-4 sm:col-span-2 sm:grid-cols-2">
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
          <p className="rounded-lg border border-[#e7b7b7] bg-[#fff1f1] px-3 py-2 text-sm font-semibold text-[#8a2d2d] sm:col-span-2">
            {error}
          </p>
        ) : null}

        {statusMessage ? (
          <p className="rounded-lg border border-[#bad8cb] bg-[#eef8f2] px-3 py-2 text-sm font-semibold text-[#255f51] sm:col-span-2">
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
          <div className="my-5 flex items-center gap-3 text-xs font-semibold text-[#718176]">
            <span className="h-px flex-1 bg-[#d7e1da]" />
            or
            <span className="h-px flex-1 bg-[#d7e1da]" />
          </div>
          <Button type="button" variant="secondary" className={`w-full ${authSecondaryButtonClass}`} disabled={submitting} onClick={handleGoogle}>
            <GoogleMark />
            Continue with Google
          </Button>
        </>
      ) : null}

      <p className="mt-6 text-center text-sm text-[#66776d]">
        Already have an account?{' '}
        <Link href="/sign-in" className="font-bold text-[#255f51] hover:text-[#17211c]">
          Sign in
        </Link>
      </p>
    </AuthShell>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <AuthShell
          eyebrow="Create profile"
          title="Start with a student account"
          description="Loading signup."
          backHref="/"
          backLabel="Intro"
          className="max-w-2xl"
        >
          <div className="h-96 animate-pulse rounded-lg bg-[#eef3ef]" />
        </AuthShell>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
