import type { ReactNode } from 'react'
import Link from 'next/link'
import {
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Code2,
  LibraryBig,
  PenTool,
  RotateCcw,
} from 'lucide-react'
import { TopBar } from '@/components/layout/top-bar'
import { Footer } from '@/components/layout/footer'
import { cn } from '@/lib/utils'

interface AuthenticatedPageShellProps {
  children: ReactNode
  current?: 'learn' | 'practice' | 'revision' | 'tutor' | 'notebook' | 'planner' | 'coding'
  maxWidth?: '5xl' | '7xl' | 'full'
  showContinuityNav?: boolean
}

const continuityLinks = [
  { key: 'learn', href: '/learn/current', label: 'Continue', icon: BookOpen },
  { key: 'practice', href: '/practice', label: 'Practice', icon: PenTool },
  { key: 'revision', href: '/revision', label: 'Revision', icon: RotateCcw },
  { key: 'tutor', href: '/tutor', label: 'LEO', icon: BrainCircuit },
  { key: 'notebook', href: '/notebook', label: 'Notebook', icon: LibraryBig },
  { key: 'planner', href: '/planner', label: 'Planner', icon: CalendarCheck },
  { key: 'coding', href: '/coding', label: 'Coding', icon: Code2 },
] as const

const widthClass = {
  '5xl': 'max-w-5xl',
  '7xl': 'max-w-7xl',
  full: 'max-w-none',
} as const

/**
 * Shared shell for authenticated standalone pages.
 * It prevents every page from inventing its own header/footer spacing and keeps
 * the desktop learning loop connected without duplicating the mobile dock.
 */
export function AuthenticatedPageShell({
  children,
  current,
  maxWidth = '7xl',
  showContinuityNav = true,
}: AuthenticatedPageShellProps) {
  return (
    <div className="flex min-h-dvh flex-col bg-background text-foreground">
      <TopBar />
      {showContinuityNav && (
        <nav
          aria-label="Learning workflow"
          className="hidden border-b border-border/70 bg-background/92 md:block"
        >
          <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2 lg:px-8">
            {continuityLinks.map((item) => {
              const Icon = item.icon
              const active = current === item.key
              return (
                <Link
                  key={item.key}
                  href={item.href}
                  aria-current={active ? 'page' : undefined}
                  className={cn(
                    'inline-flex min-h-9 shrink-0 items-center gap-2 rounded-xl px-3 text-xs font-bold transition',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                >
                  <Icon className="h-4 w-4" /> {item.label}
                </Link>
              )
            })}
          </div>
        </nav>
      )}
      <main className="min-w-0 flex-1 pb-[calc(5.75rem+env(safe-area-inset-bottom))] md:pb-0">
        <div className={cn('page-wipe mx-auto w-full px-4 py-5 sm:px-6 sm:py-7 lg:px-8', widthClass[maxWidth])}>
          {children}
        </div>
      </main>
      <div className="hidden md:block">
        <Footer />
      </div>
    </div>
  )
}
