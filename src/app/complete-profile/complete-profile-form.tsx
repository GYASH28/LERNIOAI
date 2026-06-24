'use client'

import { useState } from 'react'
import type { FormEvent, ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import { Save, UserRound } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  CAMPUS_DIVISIONS,
  CAMPUS_SEMESTERS,
  CWIT_PROGRAMMES,
  DEFAULT_CAMPUS_PROFILE,
  getCampusRoleLabel,
  normalizeCampusRole,
} from '@/lib/campus-auth'

interface CompleteProfileUser {
  name: string
  email: string
  role: string
  rollNumber: string | null
  departmentCode: string | null
  semesterNumber: number | null
  division: string | null
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

export function CompleteProfileForm({ user }: { user: CompleteProfileUser }) {
  const router = useRouter()
  const role = normalizeCampusRole(user.role)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({
    name: user.name || '',
    rollNumber: user.rollNumber || '',
    departmentCode: user.departmentCode || DEFAULT_CAMPUS_PROFILE.departmentCode,
    semesterNumber: String(user.semesterNumber || DEFAULT_CAMPUS_PROFILE.semesterNumber),
    division: user.division || DEFAULT_CAMPUS_PROFILE.division,
  })

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (form.rollNumber.trim() && !/^[A-Za-z0-9/-]{1,32}$/.test(form.rollNumber.trim())) {
      setError('Roll number format is not valid.')
      return
    }

    setSaving(true)
    setError('')
    try {
      const response = await fetch('/api/profile/complete', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name.trim(),
          rollNumber: form.rollNumber.trim(),
          departmentCode: form.departmentCode,
          semesterNumber: Number(form.semesterNumber),
          division: form.division,
        }),
      })
      const json = await response.json()
      if (!response.ok || !json.ok) {
        throw new Error(json.error?.message || 'Could not save this profile.')
      }
      router.push('/dashboard')
      router.refresh()
    } catch (profileError) {
      setError(profileError instanceof Error ? profileError.message : 'Could not save this profile.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <main className="grid min-h-screen place-items-center overflow-hidden bg-[#050816] px-4 py-10 text-white">
      <div className="pointer-events-none fixed inset-x-0 top-0 h-[34rem] bg-[linear-gradient(90deg,rgba(34,211,238,0.16),transparent_34%),linear-gradient(120deg,transparent_32%,rgba(124,58,237,0.2),transparent_72%)] opacity-70 blur-3xl" />
      <section className="relative z-10 w-full max-w-2xl rounded-3xl border border-white/10 bg-white/[0.075] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
        <div className="mb-6">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
            <UserRound className="h-3.5 w-3.5" />
            Complete profile
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-normal text-white">
            Finish your Lernio profile
          </h1>
          <p className="mt-2 text-sm leading-6 text-slate-400">
            Your account exists. Add the CWIT department, programme, semester, division, and roll number needed for the campus workspace.
          </p>
        </div>

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <Field label="Name" className="sm:col-span-2">
            <Input
              name="name"
              value={form.name}
              onChange={handleChange}
              className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
              required
            />
          </Field>
          <Field label="Email">
            <Input
              value={user.email}
              disabled
              className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-400"
            />
          </Field>
          <Field label="Role">
            <Input
              value={getCampusRoleLabel(role)}
              disabled
              className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-slate-400"
            />
          </Field>
          {['student', 'cr'].includes(role) ? (
            <Field label="Roll number">
              <Input
                name="rollNumber"
                value={form.rollNumber}
                onChange={handleChange}
                placeholder="254101"
                inputMode="text"
                pattern="[A-Za-z0-9/-]{1,32}"
                className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus-visible:border-cyan-300/70 focus-visible:ring-cyan-300/10"
              />
            </Field>
          ) : null}
          <Field label="Department / programme">
            <select
              name="departmentCode"
              value={form.departmentCode}
              onChange={handleChange}
              className="w-full rounded-2xl border border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white outline-none transition hover:border-white/20 focus:border-cyan-300/70 focus:ring-4 focus:ring-cyan-300/10"
            >
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

          {error ? (
            <p className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100 sm:col-span-2">
              {error}
            </p>
          ) : null}

          <Button
            type="submit"
            className="min-h-11 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_45px_rgba(34,211,238,0.24)] transition hover:brightness-110 sm:col-span-2"
            disabled={saving}
          >
            <Save className="h-4 w-4" />
            {saving ? 'Saving profile...' : 'Save and continue'}
          </Button>
          <Button
            type="button"
            variant="secondary"
            className="min-h-11 rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-white/15 sm:col-span-2"
            disabled={saving}
            onClick={() => router.push('/dashboard')}
          >
            Complete later
          </Button>
        </form>
      </section>
    </main>
  )
}
