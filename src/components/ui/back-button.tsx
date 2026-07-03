import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'

/**
 * Reusable back button component.
 * Links back to the dashboard by default.
 */
export function BackButton({ href = '/dashboard', label = 'Dashboard' }: { href?: string; label?: string }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground mb-4"
    >
      <ArrowLeft className="h-3.5 w-3.5" />
      {label}
    </Link>
  )
}
