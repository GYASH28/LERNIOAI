'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, BookOpenCheck, Building2, GraduationCap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'

export const authInputClass =
  'h-11 rounded-lg border-[#cbd8cf] bg-white px-3 text-sm text-[#17211c] shadow-none outline-none transition placeholder:text-[#718176] hover:border-[#9db2a6] focus-visible:border-[#2f6f5e] focus-visible:ring-4 focus-visible:ring-[#2f6f5e]/12'

export const authSelectClass =
  'h-11 w-full rounded-lg border border-[#cbd8cf] bg-white px-3 text-sm text-[#17211c] outline-none transition hover:border-[#9db2a6] focus:border-[#2f6f5e] focus:ring-4 focus:ring-[#2f6f5e]/12'

export const authPrimaryButtonClass =
  'min-h-11 rounded-lg bg-[#255f51] px-4 text-sm font-semibold text-white shadow-[0_14px_30px_rgba(37,95,81,0.22)] transition hover:bg-[#1f5145] focus-visible:ring-[#2f6f5e]/25'

export const authSecondaryButtonClass =
  'min-h-11 rounded-lg border border-[#cbd8cf] bg-white px-4 text-sm font-semibold text-[#17211c] shadow-none transition hover:border-[#9db2a6] hover:bg-[#f4f8f5] focus-visible:ring-[#2f6f5e]/15'

const authHighlights = [
  [BookOpenCheck, 'Structured subject workspace'],
  [Building2, 'Department and semester profiles'],
  [ShieldCheck, 'Credentials, Google, and invite roles'],
] as const

export function GoogleMark() {
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

function BrandLockup() {
  return (
    <Link href="/" className="inline-flex min-w-0 items-center gap-3 text-[#17211c]">
      <span className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#171820] shadow-[0_10px_26px_rgba(120,56,214,0.18)]">
        <img src="/brand/lernio-logo-mark.webp" alt="" className="block h-full w-full object-cover" />
      </span>
      <span className="min-w-0">
        <span className="block text-base font-black leading-none">Lernio</span>
        <span className="mt-1 block text-xs font-semibold text-[#66776d]">CWIT academic workspace</span>
      </span>
    </Link>
  )
}

function WorkspacePreview() {
  const rows = [
    ['Readiness', '74%', 'exam signal'],
    ['Revision', '12', 'cards due'],
    ['Focus', '86m', 'today'],
  ]

  return (
    <div className="mt-auto w-full max-w-md">
      <div className="rounded-lg border border-white/12 bg-white/8 p-4 text-white shadow-[0_22px_54px_rgba(0,0,0,0.24)] backdrop-blur">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#b9d8cc]">Today</p>
            <p className="mt-1 text-lg font-black">Student command center</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-white/12 text-[#b9d8cc]">
            <GraduationCap className="h-5 w-5" />
          </span>
        </div>
        <div className="grid gap-2">
          {rows.map(([label, value, hint]) => (
            <div key={label} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg bg-white/10 px-3 py-2">
              <div>
                <p className="text-sm font-semibold">{label}</p>
                <p className="text-xs text-white/58">{hint}</p>
              </div>
              <p className="font-mono text-lg font-black tabular-nums">{value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export function AuthShell({
  eyebrow,
  title,
  description,
  backHref = '/',
  backLabel = 'Back',
  children,
  className,
}: {
  eyebrow: string
  title: string
  description: string
  backHref?: string
  backLabel?: string
  children: ReactNode
  className?: string
}) {
  return (
    <main className="min-h-screen bg-[#f3f7f4] text-[#17211c]">
      <div className="grid min-h-screen lg:grid-cols-[minmax(0,0.92fr)_minmax(380px,560px)]">
        <aside className="relative hidden overflow-hidden bg-[#17211c] p-8 text-white lg:flex lg:flex-col">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-80"
            style={{
              background:
                'radial-gradient(circle at 20% 15%, rgba(215, 167, 69, 0.22), transparent 26%), radial-gradient(circle at 84% 20%, rgba(47, 111, 94, 0.35), transparent 30%), linear-gradient(145deg, #17211c 0%, #24362e 55%, #111816 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.08]"
            style={{
              backgroundImage:
                'linear-gradient(rgba(255,255,255,.75) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.75) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          <div className="relative z-10 flex items-center gap-3">
            <span className="grid h-12 w-12 shrink-0 place-items-center overflow-hidden rounded-xl bg-[#171820] shadow-[0_12px_32px_rgba(226,52,151,0.25)]">
              <img src="/brand/lernio-logo-mark.webp" alt="" className="block h-full w-full object-cover" />
            </span>
            <div>
              <p className="text-lg font-black leading-none">Lernio</p>
              <p className="mt-1 text-xs font-semibold text-white/58">Campus learning OS</p>
            </div>
          </div>

          <div className="relative z-10 my-16 max-w-xl">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-[#d7a745]">CWIT ready</p>
            <h2 className="mt-4 text-5xl font-black leading-[1.04] tracking-normal">
              One account for study, revision, exams, and role access.
            </h2>
            <div className="mt-8 grid gap-3 text-sm text-white/78">
              {authHighlights.map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-white/10 text-[#b9d8cc]">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <WorkspacePreview />
        </aside>

        <section className="flex min-h-screen flex-col px-4 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <BrandLockup />
            <Link
              href={backHref}
              className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold text-[#66776d] transition hover:bg-white hover:text-[#17211c] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#2f6f5e]/15"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-8">
            <div className={cn('w-full max-w-md', className)}>
              <div className="mb-6">
                <p className="text-sm font-bold text-[#2f6f5e]">{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-black leading-tight tracking-normal sm:text-4xl">{title}</h1>
                <p className="mt-3 text-sm leading-6 text-[#66776d]">{description}</p>
              </div>
              <div className="rounded-lg border border-[#d7e1da] bg-white p-5 shadow-[0_18px_55px_rgba(23,33,28,0.08)] sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
