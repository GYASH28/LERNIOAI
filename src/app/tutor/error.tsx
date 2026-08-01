'use client'

import Link from 'next/link'
import { AlertCircle, ArrowLeft, RefreshCcw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function TutorError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="grid min-h-dvh place-items-center bg-background px-4 text-center text-foreground">
      <div className="w-full max-w-lg rounded-3xl border border-border bg-card p-7 shadow-sm">
        <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-destructive/10 text-destructive">
          <AlertCircle className="h-6 w-6" />
        </span>
        <h1 className="mt-5 text-2xl font-black">LEO could not open this chat</h1>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">
          Your previous conversations have not been deleted. Retry the workspace, or return to Learn and reopen LEO with the lesson context.
        </p>
        {error.digest ? <p className="mt-3 text-[10px] text-muted-foreground">Error reference: {error.digest}</p> : null}
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Button type="button" onClick={reset} className="gap-2">
            <RefreshCcw className="h-4 w-4" /> Retry tutor
          </Button>
          <Link href="/learn" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-border px-4 text-sm font-bold hover:bg-accent">
            <ArrowLeft className="h-4 w-4" /> Back to Learn
          </Link>
        </div>
      </div>
    </main>
  )
}
