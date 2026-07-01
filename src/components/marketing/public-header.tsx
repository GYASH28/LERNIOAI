'use client'

import * as React from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { LernioBrandLockup } from '@/components/brand/lernio-logo'
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
  { label: 'Academic OS', href: '/#academic-os' },
  { label: 'How it works', href: '/#how-it-works' },
  { label: 'Subjects', href: '/#subjects' },
  { label: 'AI Tutor', href: '/#ai-tutor' },
  { label: 'Exam preparation', href: '/#exam-revision' },
  { label: 'For CWIT', href: '/#campus' },
  { label: 'FAQ', href: '/#faq' },
]

const TABLET_NAV_ITEMS = NAV_ITEMS.filter((item) =>
  ['Product', 'Academic OS', 'AI Tutor'].includes(item.label),
)

export function PublicHeader({ isAuthenticated = false }: { isAuthenticated?: boolean }) {
  const [mobileOpen, setMobileOpen] = React.useState(false)

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
      <div className="marketing-container grid h-16 grid-cols-[minmax(0,auto)_1fr_auto] items-center gap-3">
        <LernioBrandLockup href="/" size="sm" />

        <nav
          className="hidden min-w-0 items-center justify-center gap-1 lg:flex xl:hidden"
          aria-label="Primary public navigation"
        >
          {TABLET_NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <nav
          className="hidden min-w-0 items-center justify-center gap-1 xl:flex"
          aria-label="Public navigation"
        >
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="inline-flex h-10 items-center rounded-md px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center justify-end gap-2 lg:flex">
          {!isAuthenticated ? (
            <Button
              variant="ghost"
              size="sm"
              asChild
              className="h-10 min-h-10"
            >
              <Link href="/sign-in">Sign in</Link>
            </Button>
          ) : null}
          <Button size="sm" asChild className="h-10 min-h-10 gap-1.5">
            <Link href={primaryHref}>
              {primaryLabel}
              <ArrowRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
        </div>

        <div className="flex items-center justify-end gap-2 lg:hidden">
          <Button size="sm" asChild className="h-10 min-h-10 gap-1.5 px-3">
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
                className="h-11 w-11"
                aria-label="Open navigation menu"
                aria-expanded={mobileOpen}
              >
                <Menu className="h-5 w-5" aria-hidden="true" />
              </Button>
            </SheetTrigger>
            <SheetContent
              side="right"
              className="w-[min(22rem,100vw)] border-border bg-background p-0"
            >
              <SheetHeader className="border-b border-border p-4 text-left">
                <SheetTitle className="text-left">
                  <LernioBrandLockup href="/" size="sm" />
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
                {!isAuthenticated ? (
                  <SheetClose asChild>
                    <Link
                      href="/sign-in"
                      className="inline-flex min-h-11 items-center rounded-md px-3 text-sm font-medium text-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    >
                      Sign in
                    </Link>
                  </SheetClose>
                ) : null}
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
