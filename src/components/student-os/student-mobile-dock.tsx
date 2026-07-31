'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import {
  BookOpen,
  BrainCircuit,
  CalendarCheck,
  Code2,
  FileText,
  FlaskConical,
  Gamepad2,
  Home,
  LibraryBig,
  MoreHorizontal,
  PenTool,
  RotateCcw,
  Settings2,
  X,
  type LucideIcon,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/verify-email', '/privacy', '/terms']

const primaryItems: Array<{ href?: string; label: string; icon: LucideIcon; action?: 'more' }> = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: PenTool },
  { href: '/tutor', label: 'LEO', icon: BrainCircuit },
  { label: 'More', icon: MoreHorizontal, action: 'more' },
]

const moreItems = [
  { href: '/materials', label: 'Detailed Notes', description: 'Lesson-wise digital textbooks', icon: FileText },
  { href: '/revision', label: 'Revision', description: 'Due flashcards and active recall', icon: RotateCcw },
  { href: '/games', label: 'Game Lab', description: 'Curriculum-connected mini-games', icon: Gamepad2 },
  { href: '/notebook', label: 'Notebook', description: 'Notes, mistakes and formulas', icon: LibraryBig },
  { href: '/coding', label: 'Coding Lab', description: 'Predict, run and debug', icon: Code2 },
  { href: '/labs', label: 'Interactive Labs', description: 'Simulations and practical activities', icon: FlaskConical },
  { href: '/planner', label: 'Planner', description: 'Realistic study schedule', icon: CalendarCheck },
  { href: '/learning-profile', label: 'Learning Profile', description: 'Path, language and preferences', icon: Settings2 },
]

function isPublicRoute(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

export function StudentMobileDock() {
  const pathname = usePathname() || '/'
  const [moreOpen, setMoreOpen] = useState(false)

  useEffect(() => setMoreOpen(false), [pathname])

  if (isPublicRoute(pathname)) return null

  return (
    <>
      {moreOpen && (
        <div className="fixed inset-0 z-50 bg-black/55 backdrop-blur-sm md:hidden" role="dialog" aria-modal="true" aria-label="More learning tools">
          <button type="button" className="absolute inset-0" onClick={() => setMoreOpen(false)} aria-label="Close more menu" />
          <div className="absolute inset-x-0 bottom-0 max-h-[78dvh] overflow-y-auto rounded-t-3xl border border-border bg-background p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl">
            <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-muted-foreground/30" />
            <div className="flex items-start justify-between gap-4 px-1">
              <div><p className="text-xs font-bold uppercase tracking-wide text-primary">Learnio tools</p><h2 className="mt-1 text-xl font-black">More ways to learn</h2></div>
              <button type="button" onClick={() => setMoreOpen(false)} className="flex h-11 w-11 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Close more menu"><X className="h-4 w-4" /></button>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {moreItems.map((item) => {
                const active = pathname === item.href || pathname.startsWith(`${item.href}/`)
                return (
                  <Link key={item.href} href={item.href} className={cn('flex min-h-20 items-start gap-3 rounded-2xl border p-4', active ? 'border-primary bg-primary/10' : 'border-border bg-card hover:bg-accent/60')}>
                    <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary"><item.icon className="h-5 w-5" /></span>
                    <span><span className="block font-bold">{item.label}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></span>
                  </Link>
                )
              })}
            </div>
          </div>
        </div>
      )}

      <nav className="fixed inset-x-2 bottom-[max(0.5rem,env(safe-area-inset-bottom))] z-40 grid grid-cols-5 rounded-2xl border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur md:hidden" aria-label="Student mobile navigation">
        {primaryItems.map((item) => {
          const active = item.href
            ? pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(`${item.href}/`))
            : moreOpen
          const sharedClass = cn(
            'flex min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-1 text-[10px] font-bold transition-colors',
            active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
          )
          if (item.action === 'more') {
            return <button key={item.label} type="button" onClick={() => setMoreOpen(true)} className={sharedClass} aria-expanded={moreOpen}><item.icon className="h-5 w-5" /><span>{item.label}</span></button>
          }
          return <Link key={item.href} href={item.href || '/learn'} className={sharedClass}><item.icon className="h-5 w-5" /><span>{item.label}</span></Link>
        })}
      </nav>
      <div className="h-20 md:hidden" aria-hidden="true" />
    </>
  )
}
