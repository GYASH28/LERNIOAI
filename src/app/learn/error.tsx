'use client'

import { useEffect, useMemo } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  AlertTriangle,
  BookOpen,
  Home,
  RotateCcw,
} from 'lucide-react'

export default function LearnError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  const pathname = usePathname()
  const recovery = useMemo(() => recoveryRoutes(pathname), [pathname])

  useEffect(() => {
    console.error('[learn-error]', {
      pathname,
      message: error.message,
      digest: error.digest,
      stack: error.stack,
    })
  }, [error, pathname])

  return (
    <div className="mx-auto grid min-h-[45dvh] w-full max-w-2xl place-items-center px-4 py-6 sm:px-6">
      <section className="w-full overflow-hidden rounded-3xl border border-destructive/20 bg-card shadow-sm">
        <div className="border-b border-border bg-gradient-to-br from-destructive/10 via-card to-card p-5 sm:p-6">
          <div className="flex items-start gap-4">
            <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-destructive/10">
              <AlertTriangle className="h-6 w-6 text-destructive" aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-[0.14em] text-destructive">
                This lesson hit a rendering problem
              </p>
              <h1 className="mt-1 text-xl font-black tracking-tight sm:text-2xl">
                Your progress is safe. Choose the fastest recovery route.
              </h1>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Retry once. If the same lesson fails again, open its complete Materials notes or return to the subject map. The error is logged with the reference below.
              </p>
            </div>
          </div>
        </div>

        <div className="grid gap-2 p-4 sm:grid-cols-3 sm:p-5">
          <button
            type="button"
            onClick={reset}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-primary px-4 text-sm font-black text-primary-foreground"
          >
            <RotateCcw className="h-4 w-4" /> Retry lesson
          </button>
          <Link
            href={recovery.materialsHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:bg-accent"
          >
            <BookOpen className="h-4 w-4" /> Open full notes
          </Link>
          <Link
            href={recovery.subjectHref}
            className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 text-sm font-bold hover:bg-accent"
          >
            <Home className="h-4 w-4" /> Subject map
          </Link>
        </div>

        {error.digest ? (
          <p className="mx-4 mb-4 break-all rounded-xl bg-muted/60 px-3 py-2 text-[11px] text-muted-foreground sm:mx-5 sm:mb-5">
            Diagnostic reference: {error.digest}
          </p>
        ) : null}
      </section>
    </div>
  )
}

function recoveryRoutes(pathname: string) {
  const match = pathname.match(
    /^\/learn\/([^/]+)\/semester\/([^/]+)\/subject\/([^/]+)\/lesson\/([^/?#]+)/,
  )

  if (!match) {
    return { subjectHref: '/learn', materialsHref: '/materials' }
  }

  const [, programmeCode, semesterNumber, subjectCode, lessonSlug] = match
  return {
    subjectHref: `/learn/${programmeCode}/semester/${semesterNumber}/subject/${subjectCode}`,
    materialsHref: `/materials?${new URLSearchParams({
      subject: subjectCode,
      lesson: lessonSlug,
    }).toString()}`,
  }
}
