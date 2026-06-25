'use client'

import * as React from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from '@/components/ui/sheet'
import { Menu, ArrowRight } from 'lucide-react'

interface NavItem {
  label: string
  href: string
}

const NAV_ITEMS: NavItem[] = [
  { label: 'Product', href: '/#product' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Subjects', href: '/#subjects' },
  { label: 'AI Tutor', href: '/#ai-tutor' },
  { label: 'Exam preparation', href: '/#exam-revision' },
  { label: 'For CWIT', href: '/#campus' },
  { label: 'FAQ', href: '/#faq' },
]

function BrandLockup({ className }: { className?: string }) {
  return (
    <Link
      href="/"
      className={cn('flex min-w-0 items-center gap-2.5 rounded-md', className)}
      aria-label="Lernio home"
    >
      <span
        aria-hidden="true"
        className="grid h-9 w-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-primary/10 ring-1 ring-border"
      >
        {/* Inline SVG brand mark — crisp at any size, theme-aware via currentColor */}
        <svg viewBox="0 0 32 32" className="h-5 w-5" fill="none" aria-hidden="true">
          <path
            d="M8 6h12a4 4 0 0 1 4 4v16H12a4 4 0 0 1-4-4V6Z"
            stroke="currentColor"
            strokeWidth="2.2"
            strokeLinejoin="round"
            className="text-primary"
          />
          <path
            d="M12 12h8M12 16h8M12 20h5"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            className="text-primary"
          />
        </svg>
      </span>
      <span className="min-w-0">
        <span className="block text-base font-extrabold leading-none tracking-tight text-foreground">
          Lernio
        </span>
        <span className="mt-1 block text-[0.6875rem] font-semibold uppercase tracking-wider text-muted-foreground">
          Diploma learning OS
        </span>
      </span>
    </Link>
  )
}

export function PublicHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = React.useState(false)

  // Close the mobile sheet on route change
  React.useEffect(() => {
    setMobileOpen(false)
  }, [pathname])

  // Lock body scroll while the mobile sheet is open
  React.useEffect(() => {
    if (typeof document === 'undefined') return
    document.body.style.overflow = mobileOpen ? 'hidden' : ''
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileOpen])

  const primaryHref = isAuthenticated ? '/dashboard' : '/sign-up'
  const primaryLabel = isAuthenticated ? 'Open dashboard' : 'Start learning'

  return (
    <header
      className="sticky top-0 z-40 w-full border-b border-border bg-background/80 backdrop-blur-md"
      role="banner"
    >
      <div className="marketing-container flex h-16 items-center justify-between gap-4">
        <BrandLockup />

        {/* Desktop nav */}
        <nav
          className="hidden items-center gap-1 lg:flex"
          aria-label="Public navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-9 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 lg:flex">
          <Button
            variant="ghost"
            size="sm"
            asChild
            className="h-9 min-h-9"
          >
            <Link href="/sign-in">Sign in</Link>
          </Button>
          <Button size="sm" asChild className="h-9 min-h-9 gap-1.5">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        {/* Mobile: hamburger + primary CTA */}
        <div className="flex items-center gap-2 lg:hidden">
          <Button size="sm" asChild className="h-9 min-h-9 gap-1.5">
            <Link href={primaryHref}>
              {isAuthenticated ? 'Dashboard' : 'Start'}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="outline"
                size="icon"
                className="h-9 w-9"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(20rem,100vw)] border-border bg-background p-0"
            >
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="text-left">
                  <BrandLockup />
                </SheetTitle>
              </SheetHeader>
              <nav
                className="flex flex-col gap-1 p-4"
                aria-label="Mobile navigation"
              >
                {NAV_ITEMS.map((item) => (
                  <SheetClose asChild key={item.href}>
                    <Link
                      href={item.href}
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      {item.label}
                    </Link>
                  </SheetClose>
                ))}
                <div className="my-2 h-px bg-border" />
                <SheetClose asChild>
                  <Link
                    href="/sign-in"
                    className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    Sign in
                  </Link>
                </SheetClose>
                <SheetClose asChild>
                  <Link
                    href={primaryHref}
                    className="inline-flex min-h-11 items-center justify-center gap-1.5 rounded-md bg-primary px-3 text-sm font-semibold text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    {primaryLabel}
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                </SheetClose>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
