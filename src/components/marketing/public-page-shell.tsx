import type { ReactNode } from 'react'
import { PublicHeader } from './public-header'
import { PublicFooter } from './public-footer'

interface PublicPageShellProps {
  children: ReactNode
  isAuthenticated?: boolean
}

/**
 * Shared chrome for public, non-marketing pages (privacy, terms, support).
 * Renders the same PublicHeader + PublicFooter as the landing page so the
 * brand stays unified across every public surface.
 */
export function PublicPageShell({ children, isAuthenticated = false }: PublicPageShellProps) {
  return (
    <div className="flex min-h-screen flex-col bg-background text-foreground">
      <PublicHeader isAuthenticated={isAuthenticated} />
      <main className="flex-1">{children}</main>
      <PublicFooter />
    </div>
  )
}
