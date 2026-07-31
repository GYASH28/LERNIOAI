'use client'

import { useEffect } from 'react'
import { Button } from '@/components/ui/button'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error('[route-error]', error)
  }, [error])

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 px-4 text-center">
      <p className="text-sm text-muted-foreground">
        Something went wrong loading this page.
      </p>
      <div className="flex gap-2">
        <Button onClick={reset} size="sm">Try again</Button>
        <Button onClick={() => window.location.href = '/dashboard'} variant="outline" size="sm">
          Go to Dashboard
        </Button>
      </div>
    </div>
  )
}
