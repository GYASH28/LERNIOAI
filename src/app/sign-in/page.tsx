'use client'

import Link from 'next/link'
import { useState } from 'react'
import type { FormEvent } from 'react'
import { LockKeyhole, LogIn, Mail, ArrowLeft } from 'lucide-react'

const GOOGLE_ENABLED = true

export default function SignInPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState(false)

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Checking your account...')

    try {
      const params = new URLSearchParams(window.location.search)
      const callbackUrl = params.get('callbackUrl') || '/dashboard'

      const { signIn } = await import('next-auth/react')
      const result = await signIn('credentials', {
        email: email.trim(),
        password,
        redirect: false,
        callbackUrl,
      })

      setSubmitting(false)
      setStatusMessage('')

      if (result?.error) {
        setError('Invalid email or password.')
        return
      }

      const destination = result?.url ?? callbackUrl
      window.location.href = destination
    } catch {
      setSubmitting(false)
      setStatusMessage('')
      setError('Sign in failed. Please try again.')
    }
  }

  async function handleGoogleSignIn() {
    setOauthLoading(true)
    setError(null)
    setStatusMessage('Opening Google sign-in...')

    try {
      const { getFirebaseAuth, isFirebaseConfigured } = await import('@/lib/firebase/client')

      if (!isFirebaseConfigured()) {
        setError('Google sign-in is not configured. Please use email/password.')
        setOauthLoading(false)
        setStatusMessage('')
        return
      }

      const firebaseAuth = getFirebaseAuth()
      if (!firebaseAuth) {
        setError('Google sign-in is not available. Please use email/password.')
        setOauthLoading(false)
        setStatusMessage('')
        return
      }

      const { GoogleAuthProvider, signInWithPopup } = await import('firebase/auth')
      const provider = new GoogleAuthProvider()
      provider.setCustomParameters({ prompt: 'select_account' })

      setStatusMessage('Waiting for Google...')
      const result = await signInWithPopup(firebaseAuth, provider)
      const idToken = await result.user.getIdToken()

      setStatusMessage('Signing you in...')
      const response = await fetch('/api/auth/firebase', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken }),
      })

      const data = await response.json()
      if (!response.ok || !data.ok) {
        throw new Error(data?.error?.message || 'Failed to sign in')
      }

      const params = new URLSearchParams(window.location.search)
      const destination = params.get('callbackUrl') || '/dashboard'
      window.location.href = destination
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Google sign in failed'
      if (message.includes('popup') || message.includes('cancelled')) {
        setError('Google sign-in was cancelled.')
      } else {
        setError(message || 'Google sign in failed. Please try again.')
      }
      setOauthLoading(false)
      setStatusMessage('')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4 py-12" style={{ backgroundColor: '#0f172a' }}>
      <div className="w-full max-w-md space-y-6" style={{ backgroundColor: '#1e293b', borderRadius: '16px', padding: '32px', boxShadow: '0 25px 50px -12px rgba(0,0,0,0.5)' }}>
        {/* Back link */}
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Intro
        </Link>

        {/* Header */}
        <div>
          <p className="text-sm font-bold text-cyan-400">Welcome back</p>
          <h1 className="mt-2 text-3xl font-extrabold text-white">Sign in to Lernio</h1>
          <p className="mt-2 text-sm text-gray-400">
            Use your student profile or connected Google account.
          </p>
        </div>

        {/* Error / Status messages */}
        {error && (
          <div style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.4)', borderRadius: '8px', padding: '12px', color: '#fca5a5', fontSize: '14px', fontWeight: 600 }}>
            {error}
          </div>
        )}
        {statusMessage && (
          <div style={{ backgroundColor: 'rgba(6,182,212,0.1)', border: '1px solid rgba(6,182,212,0.4)', borderRadius: '8px', padding: '12px', color: '#67e8f9', fontSize: '14px', fontWeight: 600 }}>
            {statusMessage}
          </div>
        )}

        {/* Email/password form */}
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-white mb-2">
              Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                id="email"
                type="email"
                name="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="student@lernio.ai"
                autoComplete="email"
                required
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  paddingLeft: '40px',
                  paddingRight: '12px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label htmlFor="password" className="block text-sm font-semibold text-white">
                Password
              </label>
              <Link href="/forgot-password" className="text-xs font-bold text-cyan-400 hover:text-white transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <LockKeyhole className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-500" />
              <input
                id="password"
                type="password"
                name="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Your password"
                autoComplete="current-password"
                required
                style={{
                  width: '100%',
                  height: '44px',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  backgroundColor: '#0f172a',
                  color: '#f8fafc',
                  paddingLeft: '40px',
                  paddingRight: '12px',
                  fontSize: '14px',
                  outline: 'none',
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting || oauthLoading}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: 'none',
              backgroundColor: submitting || oauthLoading ? '#0e7490' : '#06b6d4',
              color: '#ffffff',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting || oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            <LogIn className="h-4 w-4" />
            {submitting ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs font-semibold text-gray-500">
          <div className="flex-1 h-px bg-gray-700" />
          or
          <div className="flex-1 h-px bg-gray-700" />
        </div>

        {/* Google button */}
        {GOOGLE_ENABLED && (
          <button
            type="button"
            disabled={submitting || oauthLoading}
            onClick={handleGoogleSignIn}
            style={{
              width: '100%',
              height: '44px',
              borderRadius: '8px',
              border: '1px solid #334155',
              backgroundColor: '#0f172a',
              color: '#f8fafc',
              fontSize: '14px',
              fontWeight: 600,
              cursor: submitting || oauthLoading ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '8px',
            }}
          >
            {oauthLoading ? (
              <span style={{ width: '16px', height: '16px', border: '2px solid #334155', borderTopColor: '#06b6d4', borderRadius: '50%', display: 'inline-block', animation: 'spin 1s linear infinite' }} />
            ) : (
              <svg className="h-4 w-4" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
              </svg>
            )}
            Continue with Google
          </button>
        )}

        {/* Sign up link */}
        <p className="text-center text-sm text-gray-400">
          New to Lernio?{' '}
          <Link href="/sign-up" className="font-bold text-cyan-400 hover:text-white transition-colors">
            Create a profile
          </Link>
        </p>
      </div>

      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  )
}
