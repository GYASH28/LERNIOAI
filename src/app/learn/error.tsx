'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowRight, Home, RotateCcw } from 'lucide-react'

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[learn-error]', {
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error])

  return (
    <div className="mx-auto grid min-h-[52dvh] w-full max-w-3xl place-items-center px-4 py-8 sm:px-6">
      <section className="w-full rounded-3xl border border-destructive/20 bg-card p-5 shadow-sm sm:p-7">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10">
            <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-black uppercase tracking-[0.14em] text-destructive">
              Lesson could not open
            </p>
            <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
              Your progress is safe. Let’s recover the learning route.
            </h1>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              This usually means a saved lesson link no longer matches the current curriculum. Open a validated lesson, retry this page, or return to Learn.
            </p>
          </div>
        </div>

        <div className="mt-5 grid gap-2 sm:grid-cols-3">
          <Link
            href="/learn/current"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
          >
            Open safe lesson <ArrowRight className="h-4 w-4" />
          </Link>
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:bg-accent"
          >
            <RotateCcw className="h-4 w-4" /> Retry page
          </button>
          <Link
            href="/learn"
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:bg-accent"
          >
            <Home className="h-4 w-4" /> Learn home
          </Link>
        </div>

        {error.digest && (
          <p className="mt-4 break-all rounded-xl bg-muted/50 px-3 py-2 text-[11px] text-muted-foreground">
            Diagnostic reference: {error.digest}
          </p>
        )}
      </section>
    </div>
  )
}
