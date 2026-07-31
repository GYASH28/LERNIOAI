'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useRef, useState } from 'react'
import { BookMarked, Gamepad2, Orbit, Settings2, X } from 'lucide-react'
import { cn } from '@/lib/utils'

const PUBLIC_PREFIXES = ['/', '/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/verify-email', '/privacy', '/terms']

const links = [
  { href: '/student-os', label: 'Learning Universe', icon: Orbit },
  { href: '/games', label: 'Game Lab', icon: Gamepad2 },
  { href: '/notebook', label: 'Notebook', icon: BookMarked },
  { href: '/learning-profile', label: 'Learning Profile', icon: Settings2 },
]

function isPublicRoute(pathname: string) {
  if (pathname === '/') return true
  return PUBLIC_PREFIXES.slice(1).some((prefix) => pathname.startsWith(prefix))
}

export function StudentOSLauncher() {
  const pathname = usePathname() || '/'
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    setOpen(false)
  }, [pathname])

  useEffect(() => {
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (open && containerRef.current && !containerRef.current.contains(event.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', closeOnOutsideClick)
    return () => document.removeEventListener('mousedown', closeOnOutsideClick)
  }, [open])

  if (isPublicRoute(pathname)) return null

  return (
    <div ref={containerRef} className="fixed bottom-[max(1rem,env(safe-area-inset-bottom))] left-[max(1rem,env(safe-area-inset-left))] z-40">
      {open && (
        <div className="mb-2 w-64 rounded-2xl border border-border bg-background/95 p-2 shadow-2xl backdrop-blur">
          <div className="flex items-center justify-between px-2 pb-2 pt-1">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">Student OS</p>
              <p className="text-xs text-muted-foreground">Personal learning tools</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="Close Student OS launcher">
              <X className="h-4 w-4" />
            </button>
          </div>
          <nav className="space-y-1">
            {links.map((link) => {
              const active = pathname === link.href || pathname.startsWith(`${link.href}/`)
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    'flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors',
                    active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              )
            })}
          </nav>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className={cn(
          'inline-flex items-center gap-2 rounded-full border px-3.5 py-2.5 text-sm font-bold shadow-lg backdrop-blur transition-transform hover:-translate-y-0.5',
          open ? 'border-primary bg-primary text-primary-foreground' : 'border-primary/30 bg-background/90 text-primary',
        )}
        aria-expanded={open}
        aria-label="Open Student OS learning tools"
      >
        <Orbit className="h-4 w-4" />
        <span className="hidden sm:inline">Student OS</span>
      </button>
    </div>
  )
}
