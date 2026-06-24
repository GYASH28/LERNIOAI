'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Chrome, Mail, UserPlus } from 'lucide-react'
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
      <Label className="text-sm font-semibold text-slate-300">{label}</Label>
      <span className="mt-2 block">{children}</span>
    </label>
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

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
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
    setStatusMessage(showInvite && form.inviteCode.trim() ? 'Checking invite code...' : 'Creating your student profile...')

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
        throw new Error('Account created, but automatic login failed. Please use the login page.')
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
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#050816] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[34rem] bg-[linear-gradient(90deg,rgba(34,211,238,0.16),transparent_34%),linear-gradient(120deg,transparent_32%,rgba(124,58,237,0.2),transparent_72%)] opacity-70 blur-3xl" />
      <div className="relative z-10 w-full max-w-2xl animate-in fade-in slide-in-from-bottom-5 duration-500">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to introduction
        </Link>

        <section className="rounded-3xl border border-white/10 bg-white/[0.075] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div className="mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
              <UserPlus className="h-3.5 w-3.5" />
              Get started
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-normal text-white">
              Create your Lernio profile
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Create your own Lernio account. No college-issued username is required. CR, teacher, coordinator, reviewer, moderator, and admin access needs an approved invite code.
            </p>
          </div>

          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <Field label="Full name" className="sm:col-span-2">
              <Input
                name="name"
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                autoComplete="name"
                className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
                required
              />
            </Field>
            <Field label="Email" className="sm:col-span-2">
              <div className="relative">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 pl-11 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
                  required
                />
              </div>
            </Field>
            <Field label="Password">
              <Input
                type="password"
                name="password"
                value={form.password}
                onChange={handleChange}
                placeholder="At least 8 characters"
                autoComplete="new-password"
                className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
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
                className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
                required
              />
            </Field>
            <div className="sm:col-span-2">
              <button
                type="button"
                className="text-sm font-semibold text-cyan-200 transition hover:text-white"
                onClick={() => setShowAcademic((value) => !value)}
              >
                {showAcademic ? 'Hide academic details' : 'Add academic details now'}
              </button>
            </div>
            {showAcademic ? (
              <>
                <Field label="Roll number">
                  <Input
                    name="rollNumber"
                    value={form.rollNumber}
                    onChange={handleChange}
                    placeholder="Optional"
                    inputMode="text"
                    pattern="[A-Za-z0-9/-]{1,32}"
                    className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
                  />
                  <p className="mt-2 text-xs text-slate-500">Optional at signup. You can add it later from profile completion.</p>
                </Field>
                <Field label="Department / programme">
                  <select
                    name="departmentCode"
                    value={form.departmentCode}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  >
                    <option value="">Choose later</option>
                    {CWIT_PROGRAMMES.map((programme) => (
                      <option key={programme.programmeCode} value={programme.departmentCode}>
                        {programme.programmeName}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Semester">
                  <select
                    name="semesterNumber"
                    value={form.semesterNumber}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  >
                    <option value="">Choose later</option>
                    {CAMPUS_SEMESTERS.map((semester) => (
                      <option key={semester} value={semester}>
                        Semester {semester}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Division">
                  <select
                    name="division"
                    value={form.division}
                    onChange={handleChange}
                    className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
                  >
                    {CAMPUS_DIVISIONS.map((division) => (
                      <option key={division} value={division}>
                        {division === 'NOT_SURE' ? 'Not sure' : `Division ${division}`}
                      </option>
                    ))}
                  </select>
                </Field>
              </>
            ) : null}
            <div className="sm:col-span-2">
              {showInvite ? (
                <Field label="Invite code">
                  <Input
                    name="inviteCode"
                    value={form.inviteCode}
                    onChange={(event) => setForm((current) => ({ ...current, inviteCode: event.target.value.toUpperCase() }))}
                    placeholder="LM-TEA-123456"
                    className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
                  />
                  <p className="mt-2 text-xs text-slate-500">Only approved CR, teacher, coordinator, or admin invite codes unlock elevated access.</p>
                </Field>
              ) : (
                <button
                  type="button"
                  className="text-sm font-semibold text-cyan-200 transition hover:text-white"
                  onClick={() => setShowInvite(true)}
                >
                  Have an invite code?
                </button>
              )}
            </div>

            {error ? (
              <p className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 sm:col-span-2">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_45px_rgba(34,211,238,0.24)] transition hover:brightness-110 sm:col-span-2"
              disabled={submitting}
            >
              <UserPlus className="h-4 w-4" />
              {submitting ? 'Creating account...' : 'Create account'}
            </Button>
          </form>

          {statusMessage ? (
            <p className="mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
              {statusMessage}
            </p>
          ) : null}

          {providers?.google ? (
            <>
              <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/15 hover:text-white"
                disabled={submitting}
                onClick={handleGoogle}
              >
                <Chrome className="h-4 w-4" />
                Continue with Google
              </Button>
            </>
          ) : null}

          <p className="mt-6 text-center text-sm text-slate-400">
            Already have an account?{' '}
            <Link href="/sign-in" className="font-semibold text-cyan-200 hover:text-white">
              Login
            </Link>
          </p>
        </section>
      </div>
    </main>
  )
}

export default function SignUpPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center bg-[#050816] px-4 py-10 text-white">
          <div className="h-96 w-full max-w-2xl animate-pulse rounded-3xl bg-white/10" />
        </main>
      }
    >
      <SignUpForm />
    </Suspense>
  )
}
