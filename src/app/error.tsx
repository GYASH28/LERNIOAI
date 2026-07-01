'use client'

import { useEffect } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'

/**
 * Global error boundary.
 * Catches unhandled errors in any route segment and shows a friendly
 * recovery page instead of a blank white screen.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Log to console for server-side error tracking (Vercel picks this up).
    console.error('Route error:', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-destructive/10">
        <AlertTriangle className="h-7 w-7 text-destructive" aria-hidden="true" />
      </div>
      <div className="space-y-1.5">
        <h2 className="text-lg font-semibold text-foreground">Something went wrong</h2>
        <p className="text-sm text-muted-foreground max-w-md">
          An unexpected error occurred. Your progress is safe — try again, or refresh the page
          if the problem persists.
        </p>
      </div>
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <RotateCcw className="h-4 w-4" aria-hidden="true" />
          Try again
        </button>
        <button
          onClick={() => window.location.reload()}
          className="inline-flex items-center rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          Refresh page
        </button>
      </div>
      {error.digest && (
        <p className="text-xs text-muted-foreground/60 mt-2">Error ID: {error.digest}</p>
      )}
    </div>
  )
}
