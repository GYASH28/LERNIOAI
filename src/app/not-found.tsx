import Link from 'next/link'
import { Home, Search, BookOpen } from 'lucide-react'

/**
 * Custom 404 page.
 * Replaces the default Next.js 404 with a helpful page that guides the
 * user back to useful destinations.
 */
export default function NotFound() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center gap-6 p-8 text-center">
      <div className="space-y-2">
        <p className="text-6xl font-bold text-primary">404</p>
        <h1 className="text-xl font-semibold text-foreground">Page not found</h1>
        <p className="text-sm text-muted-foreground max-w-md">
          The page you're looking for doesn't exist or has been moved. Try one of these
          instead:
        </p>
      </div>
      <div className="flex flex-wrap gap-3 justify-center">
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-1.5 rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors"
        >
          <Home className="h-4 w-4" aria-hidden="true" />
          Dashboard
        </Link>
        <Link
          href="/learn"
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <BookOpen className="h-4 w-4" aria-hidden="true" />
          Browse lessons
        </Link>
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 rounded-md border border-input px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Search className="h-4 w-4" aria-hidden="true" />
          Home
        </Link>
      </div>
    </div>
  )
}
