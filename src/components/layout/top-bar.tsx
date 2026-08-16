'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import {
  BarChart3,
  BookOpen,
  Bot,
  CalendarCheck,
  FileText,
  Home,
  Library,
  LogOut,
  Moon,
  RotateCw,
  Search,
  Settings,
  Sun,
  Target,
  User,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import { usePrefs } from '@/components/theme-provider'
import { NotificationBell } from '@/components/navbar/notification-bell'

const primary = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Target },
  { href: '/exams', label: 'Tests', icon: FileText },
  { href: '/tutor', label: 'AI Tutor', icon: Bot },
  { href: '/revision', label: 'Revision', icon: RotateCw },
]

const secondary = [
  { href: '/planner', label: 'Planner', icon: CalendarCheck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/materials', label: 'Resources', icon: Library },
]

const mobilePrimary = [primary[0], primary[1], primary[2], primary[4], primary[5]]

function active(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

export function TopBar() {
  const pathname = usePathname() || '/'
  const { pref, setPref } = usePrefs()
  const isDark = pref.appearance === 'dark'

  function openSearch() {
    const isMac = navigator.platform.includes('Mac')
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: isMac, ctrlKey: !isMac }))
  }

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-border bg-background/90 backdrop-blur-xl supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-14 w-full max-w-7xl items-center gap-3 px-4 sm:px-6">
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <LernioLogoTile className="h-7 w-7" />
            <span className="hidden text-sm font-bold sm:inline">Lernio AI</span>
          </Link>

          <nav className="ml-2 hidden flex-1 items-center gap-0.5 md:flex">
            {primary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  active(pathname, item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden xl:inline">{item.label}</span>
              </Link>
            ))}

            <div className="mx-1 h-5 w-px bg-border" />
            {secondary.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  'flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-sm font-medium transition-colors',
                  active(pathname, item.href)
                    ? 'bg-primary/10 text-primary'
                    : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                )}
              >
                <item.icon className="h-4 w-4" />
                <span className="hidden 2xl:inline">{item.label}</span>
              </Link>
            ))}
          </nav>

          <div className="ml-auto flex items-center gap-1">
            <button onClick={openSearch} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Search Lernio">
              <Search className="h-4 w-4" />
            </button>
            <NotificationBell />
            <button
              onClick={() => setPref({ appearance: isDark ? 'light' : 'dark' })}
              className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>
            <Link href="/profile" className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:flex" aria-label="Profile">
              <User className="h-4 w-4" />
            </Link>
            <Link href="/settings" className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground lg:flex" aria-label="Settings">
              <Settings className="h-4 w-4" />
            </Link>
            <button onClick={() => signOut({ callbackUrl: '/sign-in' })} className="hidden h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:bg-accent hover:text-foreground sm:flex" aria-label="Sign out">
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </header>

      <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-2 pb-[max(.35rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-xl md:hidden">
        <div className="mx-auto grid max-w-lg grid-cols-5">
          {mobilePrimary.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'flex min-h-12 flex-col items-center justify-center gap-0.5 rounded-lg text-[10px] font-medium',
                active(pathname, item.href) ? 'text-primary' : 'text-muted-foreground',
              )}
            >
              <item.icon className="h-4.5 w-4.5" />
              <span>{item.label}</span>
            </Link>
          ))}
        </div>
      </nav>
      <div className="h-16 md:hidden" aria-hidden="true" />
    </>
  )
}
