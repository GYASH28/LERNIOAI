'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowLeft, BookOpenCheck, Building2, GraduationCap, ShieldCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { LernioBrandLockup, LernioLogoTile } from '@/components/brand/lernio-logo'

/**
 * Shared auth surface classes.
 *
 * These use the global semantic tokens (var(--border), var(--background),
 * var(--primary), var(--ring), var(--muted-foreground) etc.) so the auth
 * pages share one brand system with the marketing site and the
 * authenticated app — instead of the old hardcoded green/gold palette.
 *
 * Exported class strings (not components) so the existing sign-in / sign-up
 * / reset-password / forgot-password pages keep working unchanged.
 */
export const authInputClass =
  'h-11 rounded-lg border border-input bg-background px-3 text-sm text-foreground shadow-none outline-none transition placeholder:text-muted-foreground hover:border-strong focus-visible:border-primary focus-visible:ring-4 focus-visible:ring-primary/15'

export const authSelectClass =
  'h-11 w-full rounded-lg border border-input bg-background px-3 text-sm text-foreground outline-none transition hover:border-strong focus:border-primary focus:ring-4 focus:ring-primary/15'

export const authPrimaryButtonClass =
  'min-h-11 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-sm transition hover:bg-primary/90 focus-visible:ring-primary/25'

export const authSecondaryButtonClass =
  'min-h-11 rounded-lg border border-input bg-background px-4 text-sm font-semibold text-foreground shadow-none transition hover:bg-muted focus-visible:ring-primary/15'

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

function BrandMark() {
  return <LernioLogoTile size="md" />
}

function BrandLockup() {
  return <LernioBrandLockup href="/" size="md" />
}

function WorkspacePreview() {
  const rows = [
    ['Readiness', '74%', 'exam signal'],
    ['Revision', '12', 'cards due'],
    ['Focus', '86m', 'today'],
  ] as const

  return (
    <div className="mt-auto w-full max-w-md">
      <div className="rounded-lg border border-border bg-card p-4 text-card-foreground shadow-sm">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              Today
            </p>
            <p className="mt-1 text-lg font-bold">Student command center</p>
          </div>
          <span className="grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
            <GraduationCap className="h-5 w-5" />
          </span>
        </div>
        <div className="grid gap-2">
          {rows.map(([label, value, hint]) => (
            <div
              key={label}
              className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-foreground">{label}</p>
                <p className="text-xs text-muted-foreground">{hint}</p>
              </div>
              <p className="font-mono text-lg font-bold tabular-nums text-foreground">
                {value}
              </p>
            </div>
          ))}
        </div>
        <p className="mt-3 text-xs text-muted-foreground">
          Demo preview — not your account
        </p>
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
    <main className="min-h-dvh bg-background text-foreground">
      <div className="grid min-h-dvh xl:grid-cols-[minmax(0,0.92fr)_minmax(380px,560px)]">
        {/* Left brand panel — uses semantic tokens, no hardcoded green/gold */}
        <aside className="relative hidden overflow-hidden border-r border-border bg-muted/40 p-6 xl:flex xl:flex-col 2xl:p-8">
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-90"
            style={{
              background:
                'radial-gradient(circle at 20% 15%, color-mix(in oklch, var(--brand) 18%, transparent), transparent 28%), radial-gradient(circle at 84% 20%, color-mix(in oklch, var(--secondary-action) 16%, transparent), transparent 30%), linear-gradient(145deg, var(--surface-2) 0%, var(--surface-3) 55%, var(--surface-2) 100%)',
            }}
          />
          <div
            aria-hidden="true"
            className="absolute inset-0 opacity-[0.06]"
            style={{
              backgroundImage:
                'linear-gradient(to right, var(--text-default) 1px, transparent 1px), linear-gradient(to bottom, var(--text-default) 1px, transparent 1px)',
              backgroundSize: '44px 44px',
            }}
          />
          <div className="relative z-10 flex items-center gap-3">
            <BrandMark />
            <div>
              <p className="text-lg font-extrabold leading-none text-foreground">
                Lernio
              </p>
              <p className="mt-1 text-xs font-semibold text-muted-foreground">
                Diploma learning OS
              </p>
            </div>
          </div>

          <div className="relative z-10 my-10 max-w-xl 2xl:my-14">
            <p className="text-sm font-semibold uppercase tracking-[0.16em] text-primary">
              CWIT ready
            </p>
            <h2 className="mt-4 text-3xl font-extrabold leading-[1.08] tracking-tight text-foreground 2xl:text-5xl">
              One account for study, revision, exams, and role access.
            </h2>
            <div className="mt-6 grid gap-3 text-sm text-muted-foreground 2xl:mt-8">
              {authHighlights.map(([Icon, text]) => (
                <div key={text} className="flex items-center gap-3">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary ring-1 ring-border">
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="font-semibold text-foreground">{text}</span>
                </div>
              ))}
            </div>
          </div>

          <WorkspacePreview />
        </aside>

        {/* Right form panel */}
        <section className="flex min-h-dvh flex-col px-5 py-6 sm:px-6 lg:px-10">
          <div className="flex items-center justify-between">
            <BrandLockup />
            <Link
              href={backHref}
              className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-md px-3 py-2 text-sm font-semibold text-muted-foreground transition hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeft className="h-4 w-4" />
              {backLabel}
            </Link>
          </div>

          <div className="flex flex-1 items-center justify-center py-6 sm:py-8">
            <div className={cn('w-full max-w-md', className)}>
              <div className="mb-6">
                <p className="text-sm font-bold text-primary">{eyebrow}</p>
                <h1 className="mt-2 text-3xl font-extrabold leading-tight tracking-tight sm:text-4xl">
                  {title}
                </h1>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">
                  {description}
                </p>
              </div>
              <div className="rounded-lg border border-border bg-card p-5 shadow-sm sm:p-6">
                {children}
              </div>
            </div>
          </div>
        </section>
      </div>
    </main>
  )
}
