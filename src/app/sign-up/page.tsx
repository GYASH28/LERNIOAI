'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { ChevronDown, Mail, UserPlus, ArrowLeft } from 'lucide-react'

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

export default function SignUpPage() {
  const [form, setForm] = useState(initialForm)
  const [showInvite, setShowInvite] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [statusMessage, setStatusMessage] = useState('')
  const [error, setError] = useState('')

  function handleChange(event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) {
    setForm((current) => ({ ...current, [event.target.name]: event.target.value }))
  }

  function validate() {
    if (!form.name.trim()) return 'Enter your full name.'
    if (!form.email.trim()) return 'Enter your email address.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return 'Enter a valid email address.'
    if (form.password.length < 12) return 'Password must be at least 12 characters.'
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
        setError('Google sign-in is not available.')
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
        setError(message)
      }
      setStatusMessage('')
      setSubmitting(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    height: '44px',
    borderRadius: '8px',
    border: '1px solid #334155',
    backgroundColor: '#0f172a',
    color: '#f8fafc',
    padding: '0 12px',
    fontSize: '14px',
    outline: 'none',
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-2xl" style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors mb-4">
          <ArrowLeft className="h-4 w-4" />
          Intro
        </Link>

        <div className="mb-6">
          <p className="text-sm font-bold text-cyan-400">Create profile</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Start with a student account</h1>
          <p className="mt-2 text-sm text-gray-400">
            Students can sign up directly. CR, teacher, coordinator, reviewer, moderator, and admin access need an invite code.
          </p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
            {error}
          </div>
        )}
        {statusMessage && (
          <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px', padding: '12px', color: '#67e8f9', fontSize: '14px', fontWeight: 600, marginBottom: '16px' }}>
            {statusMessage}
          </div>
        )}

        <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-semibold text-white mb-2">Full name</label>
            <input style={inputStyle} type="text" name="name" value={form.name} onChange={handleChange} placeholder="Aarav Sharma" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Email</label>
            <input style={inputStyle} type="email" name="email" value={form.email} onChange={handleChange} placeholder="aarav@lernio.ai" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Password (min 12 chars)</label>
            <input style={inputStyle} type="password" name="password" value={form.password} onChange={handleChange} placeholder="••••••••••••" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Confirm password</label>
            <input style={inputStyle} type="password" name="confirmPassword" value={form.confirmPassword} onChange={handleChange} placeholder="••••••••••••" required />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Roll number (optional)</label>
            <input style={inputStyle} type="text" name="rollNumber" value={form.rollNumber} onChange={handleChange} placeholder="2023/DCOMP/045" />
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Department</label>
            <select style={inputStyle} name="departmentCode" value={form.departmentCode} onChange={handleChange}>
              <option value="">Select department</option>
              <option value="DCOMP">Computer Engineering (DCOMP)</option>
              <option value="DCIOT">Computer IoT (DCIOT)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Semester</label>
            <select style={inputStyle} name="semesterNumber" value={form.semesterNumber} onChange={handleChange}>
              <option value="">Select semester</option>
              {[1, 2, 3, 4, 5, 6].map((s) => (
                <option key={s} value={s}>Semester {s}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-white mb-2">Division</label>
            <select style={inputStyle} name="division" value={form.division} onChange={handleChange}>
              <option value="NOT_SURE">Not sure</option>
              <option value="A">A</option>
              <option value="B">B</option>
              <option value="C">C</option>
            </select>
          </div>

          {showInvite && (
            <div className="sm:col-span-2">
              <label className="block text-sm font-semibold text-white mb-2">Invite code</label>
              <input style={inputStyle} type="text" name="inviteCode" value={form.inviteCode} onChange={handleChange} placeholder="Enter invite code for role-based access" />
            </div>
          )}

          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={() => setShowInvite(!showInvite)}
              className="inline-flex items-center gap-1 text-xs text-gray-400 hover:text-white transition-colors"
            >
              <ChevronDown className="h-3 w-3" />
              {showInvite ? 'Hide invite code' : 'Have an invite code? (CR / Teacher / Admin)'}
            </button>
          </div>

          <button
            type="submit"
            disabled={submitting}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: submitting ? '#0e7490' : '#06b6d4',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
            className="sm:col-span-2"
          >
            <UserPlus className="h-4 w-4" />
            {submitting ? 'Creating profile...' : 'Create profile'}
          </button>
        </form>

        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500 my-5">
          <div className="flex-1 h-px bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        <button
          type="button"
          disabled={submitting}
          onClick={handleGoogle}
          style={{
            width: '100%',
            height: '44px',
            borderRadius: '8px',
            border: '1px solid #334155',
            backgroundColor: '#0f172a',
            color: '#f8fafc',
            fontSize: '14px',
            fontWeight: 600,
            cursor: submitting ? 'not-allowed' : 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          Continue with Google
        </button>

        <p className="mt-6 text-center text-sm text-gray-400">
          Already have an account?{' '}
          <Link href="/sign-in" className="font-bold text-cyan-400 hover:text-white transition-colors">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  )
}
