'use client'

import Link from 'next/link'
import { Suspense, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { getProviders, signIn } from 'next-auth/react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ArrowLeft, LogIn, Mail, Shield } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { safeCallbackPath } from '@/lib/auth-policy'

const pageBackground =
  'radial-gradient(circle at top left, rgba(14, 165, 233, 0.2), transparent 30%), radial-gradient(circle at top right, rgba(124, 58, 237, 0.16), transparent 28%), linear-gradient(135deg, #050816 0%, #0a1020 48%, #101827 100%)'

function GoogleMark() {
  return (
    <svg className="h-5 w-5" aria-hidden="true" focusable="false" viewBox="0 0 48 48">
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24c0-1.55-.15-3.24-.47-4.78H24v9.03h12.72c-.55 2.87-2.17 5.31-4.62 6.95l7.19 5.57C43.5 36.32 46.5 30.82 46.5 24z"
      />
      <path
        fill="#FBBC05"
        d="M10.54 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.98-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.19-5.57c-2.2 1.47-5.01 2.38-8.7 2.38-6.26 0-11.57-4.22-13.46-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
  )
}

function SignInForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const callbackUrl = safeCallbackPath(searchParams.get('callbackUrl'))
  const authError = searchParams.get('error')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(
    authError ? 'Your session could not be verified. Please sign in again.' : null
  )
  const [statusMessage, setStatusMessage] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [oauthLoading, setOauthLoading] = useState<string | null>(null)
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

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setSubmitting(true)
    setError(null)
    setStatusMessage('Loading your dashboard...')

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

    router.push(result?.url ?? callbackUrl)
    router.refresh()
  }

  async function handleOAuthSignIn(provider: string) {
    setOauthLoading(provider)
    setError(null)
    setStatusMessage('Redirecting to your workspace...')
    try {
      await signIn(provider, { callbackUrl })
    } catch {
      setError('Google sign in failed. Please try again.')
      setOauthLoading(null)
      setStatusMessage('')
    }
  }

  return (
    <main className="relative grid min-h-screen place-items-center overflow-hidden px-4 py-10 text-white" style={{ background: pageBackground }}>
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-x-0 top-0 h-[34rem] opacity-70 blur-3xl"
        style={{
          background:
            'linear-gradient(90deg, rgba(34, 211, 238, 0.16), transparent 34%), linear-gradient(120deg, transparent 32%, rgba(124, 58, 237, 0.2), transparent 72%)',
        }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0"
        style={{
          backgroundImage:
            'linear-gradient(rgba(148, 163, 184, 0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(148, 163, 184, 0.06) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
          maskImage: 'linear-gradient(to bottom, rgba(0, 0, 0, 0.85), transparent 78%)',
        }}
      />

      <div className="relative z-10 w-full max-w-md animate-in fade-in slide-in-from-bottom-5 duration-500">
        <Link
          href="/"
          className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-300 transition hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to landing
        </Link>

        <section className="relative overflow-hidden rounded-3xl border border-white/10 bg-white/[0.075] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 rounded-3xl border border-white/10 bg-[linear-gradient(135deg,rgba(255,255,255,0.12),transparent_32%,rgba(34,211,238,0.08))]"
          />

          <div className="relative mb-6">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan-300/25 bg-cyan-300/10 px-3 py-1 text-xs font-bold text-cyan-100">
              <Shield className="h-3.5 w-3.5" />
              Lernio Login
            </span>
            <h1 className="mt-4 text-3xl font-black tracking-normal text-white">
              Enter your dashboard
            </h1>
            <p className="mt-2 text-sm leading-6 text-slate-400">
              Students, CRs, teachers, coordinators, and institute admins are routed through the Lernio campus hierarchy.
            </p>
          </div>

          <form onSubmit={submit} className="relative space-y-4">
            <label className="block">
              <Label htmlFor="email" className="text-sm font-semibold text-slate-300">
                Email
              </Label>
              <span className="relative mt-2 block">
                <Mail className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <Input
                  id="email"
                  type="email"
                  name="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  placeholder="student@lernio.ai"
                  autoComplete="email"
                  required
                  className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 pl-11 text-sm text-white shadow-none outline-none placeholder:text-slate-500 hover:border-white/20 focus-visible:border-cyan-300/70 focus-visible:bg-slate-950/75 focus-visible:ring-4 focus-visible:ring-cyan-300/10"
                />
              </span>
            </label>

            <label className="block">
              <Label htmlFor="password" className="text-sm font-semibold text-slate-300">
                Password
              </Label>
              <span className="relative mt-2 block">
                <Input
                  id="password"
                  type="password"
                  name="password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  placeholder="Your password"
                  autoComplete="current-password"
                  required
                  className="h-auto rounded-2xl border-white/10 bg-slate-950/55 px-4 py-3 text-sm text-white shadow-none outline-none placeholder:text-slate-500 hover:border-white/20 focus-visible:border-cyan-300/70 focus-visible:bg-slate-950/75 focus-visible:ring-4 focus-visible:ring-cyan-300/10"
                />
              </span>
            </label>

            {error ? (
              <p className="rounded-2xl border border-rose-300/25 bg-rose-500/10 px-4 py-3 text-sm font-semibold text-rose-100">
                {error}
              </p>
            ) : null}

            <Button
              type="submit"
              className="min-h-11 w-full rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-violet-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_0_45px_rgba(34,211,238,0.24)] transition hover:brightness-110 focus-visible:ring-cyan-300/20"
              disabled={submitting || !!oauthLoading}
            >
              <LogIn className="h-4 w-4" />
              {submitting ? 'Signing in...' : 'Login'}
            </Button>
          </form>

          {statusMessage ? (
            <p className="relative mt-3 rounded-2xl border border-cyan-300/20 bg-cyan-300/10 px-4 py-3 text-sm font-semibold text-cyan-100">
              {statusMessage}
            </p>
          ) : null}

          {providers?.google ? (
            <div className="relative">
              <div className="my-5 flex items-center gap-3 text-xs text-slate-500">
                <span className="h-px flex-1 bg-white/10" />
                or
                <span className="h-px flex-1 bg-white/10" />
              </div>
              <Button
                type="button"
                variant="secondary"
                className="min-h-11 w-full rounded-2xl border border-white/10 bg-white/10 px-4 py-2.5 text-sm font-semibold text-white transition hover:border-cyan-300/40 hover:bg-white/15 hover:text-white focus-visible:ring-cyan-300/20 disabled:opacity-60"
                disabled={submitting || !!oauthLoading}
                onClick={() => handleOAuthSignIn('google')}
              >
                {oauthLoading === 'google' ? (
                  <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                ) : (
                  <GoogleMark />
                )}
                Continue with Google
              </Button>
            </div>
          ) : null}

          <p className="relative mt-6 text-center text-sm text-slate-400">
            New student?{' '}
            <Link href="/sign-up" className="font-semibold text-cyan-200 hover:text-white">
              Create your profile
            </Link>
            . Elevated roles need an invite code.
          </p>
        </section>
      </div>
    </main>
  )
}

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <main className="grid min-h-screen place-items-center px-4 py-10 text-white" style={{ background: pageBackground }}>
          <div className="w-full max-w-md rounded-3xl border border-white/10 bg-white/[0.075] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.38)] backdrop-blur-xl">
            <div className="h-72 animate-pulse rounded-2xl bg-white/10" />
          </div>
        </main>
      }
    >
      <SignInForm />
    </Suspense>
  )
}
