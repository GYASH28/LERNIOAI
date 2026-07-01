'use client'

import { useState, useCallback } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { signOut } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import {
  LayoutDashboard,
  BookOpen,
  PenTool,
  Bot,
  FlaskConical,
  Code2,
  FileText,
  RotateCw,
  Library,
  CalendarCheck,
  BarChart3,
  User,
  Menu,
  X,
  Flame,
  Zap,
  Settings,
  Search,
  LogOut,
  MessageSquare,
  Sun,
  Moon,
  ChevronDown,
  ChevronUp,
  Trophy,
  GraduationCap,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'
import { routeForView } from '@/lib/routes'
import { usePrefs } from '@/components/theme-provider'
import { NotificationBell } from '@/components/navbar/notification-bell'

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof BookOpen }[] = [
  { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { key: 'learn', label: 'Learn', icon: BookOpen },
  { key: 'practice', label: 'Practice', icon: PenTool },
  { key: 'tutor', label: 'AI Tutor', icon: Bot },
  { key: 'labs', label: 'Labs', icon: FlaskConical },
  { key: 'coding', label: 'Coding Lab', icon: Code2 },
  { key: 'exams', label: 'Exams', icon: FileText },
  { key: 'revision', label: 'Revision', icon: RotateCw },
  { key: 'materials', label: 'Materials', icon: Library },
  { key: 'planner', label: 'Planner', icon: CalendarCheck },
  { key: 'analytics', label: 'Analytics', icon: BarChart3 },
  { key: 'profile', label: 'Profile', icon: User },
]

const EXTRA_LINKS: { href: string; label: string; icon: typeof BookOpen }[] = [
  { href: '/leaderboard', label: 'Leaderboard', icon: Trophy },
  { href: '/teacher-dashboard', label: 'Teacher Dashboard', icon: GraduationCap },
  { href: '/feedback', label: 'Feedback', icon: MessageSquare },
  { href: '/help', label: 'Help Center', icon: HelpCircle },
]

function isActivePath(pathname: string, href: string) {
  if (href === '/dashboard' && pathname === '/dashboard') return true
  if (href !== '/dashboard' && pathname.startsWith(href)) return true
  return false
}

/**
 * Collapsible TopBar — replaces the sidebar.
 * Can be hidden/shown with a toggle button.
 * On mobile, collapses into a hamburger menu drawer.
 */
export function TopBar() {
  const pathname = usePathname() || '/'
  const [hidden, setHidden] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)
  const [mobileMoreOpen, setMobileMoreOpen] = useState(false)

  const user = useAppStore((s) => s.user)
  const xp = useAppStore((s) => s.xp)
  const streak = useAppStore((s) => s.streak)
  const { pref, setPref } = usePrefs()
  const isDark = pref.appearance === 'dark'

  const toggleHidden = useCallback(() => setHidden((h) => !h), [])
  const toggleMobile = useCallback(() => setMobileOpen((o) => !o), [])

  // Primary nav items shown on desktop
  const primaryItems = NAV_ITEMS.slice(0, 7)
  const moreItems = NAV_ITEMS.slice(7)

  if (hidden) {
    return (
      <button
        onClick={toggleHidden}
        className="fixed top-2 left-1/2 z-50 -translate-x-1/2 rounded-full border border-border bg-background/95 px-3 py-1.5 text-xs text-muted-foreground shadow-md backdrop-blur transition-colors hover:bg-accent"
        aria-label="Show top bar"
      >
        <ChevronDown className="h-3 w-3 inline mr-1" />
        Show menu
      </button>
    )
  }

  return (
    <>
      {/* Desktop top bar */}
      <header className="sticky top-0 z-40 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
        <div className="flex h-14 items-center gap-3 px-3 sm:px-4">
          {/* Logo + collapse */}
          <Link href="/dashboard" className="flex shrink-0 items-center gap-2">
            <LernioLogoTile className="h-7 w-7" />
            <span className="hidden text-sm font-bold sm:inline">Lernio AI</span>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden flex-1 items-center gap-0.5 md:flex lg:gap-1">
            {primaryItems.map((item) => {
              const href = routeForView(item.key)
              const active = isActivePath(pathname, href)
              return (
                <Link
                  key={item.key}
                  href={href}
                  prefetch={true}
                  onClick={() => useAppStore.getState().setView(item.key)}
                  className={cn(
                    'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary'
                      : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                  )}
                  aria-current={active ? 'page' : undefined}
                >
                  <item.icon className="h-4 w-4" />
                  <span className="hidden lg:inline">{item.label}</span>
                </Link>
              )
            })}

            {/* More dropdown for secondary items */}
            <div className="group relative">
              <button className="flex items-center gap-1 rounded-md px-2.5 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:bg-accent hover:text-foreground">
                <span className="hidden lg:inline">More</span>
                <ChevronDown className="h-3 w-3" />
              </button>
              <div className="absolute right-0 top-full hidden min-w-[180px] rounded-lg border border-border bg-popover py-1 shadow-lg group-hover:block">
                {moreItems.map((item) => {
                  const href = routeForView(item.key)
                  const active = isActivePath(pathname, href)
                  return (
                    <Link
                      key={item.key}
                      href={href}
                      prefetch={true}
                      onClick={() => useAppStore.getState().setView(item.key)}
                      className={cn(
                        'flex items-center gap-2 px-3 py-2 text-sm transition-colors',
                        active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                      )}
                    >
                      <item.icon className="h-4 w-4" />
                      {item.label}
                    </Link>
                  )
                })}
              </div>
            </div>
          </nav>

          {/* Search + actions */}
          <div className="flex flex-1 items-center justify-end gap-1.5 md:flex-none">
            <button
              onClick={() => {
                window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
              }}
              className="hidden items-center gap-1.5 rounded-md border border-border px-2.5 py-1.5 text-xs text-muted-foreground transition-colors hover:bg-accent sm:flex"
              aria-label="Quick search"
            >
              <Search className="h-3.5 w-3.5" />
              <span className="hidden lg:inline">Search</span>
              <kbd className="hidden rounded border border-border px-1 font-mono text-[10px] lg:inline">⌘K</kbd>
            </button>

            <NotificationBell />

            {/* XP + Streak */}
            <div className="hidden items-center gap-2 sm:flex">
              <div className="flex items-center gap-1 rounded-md bg-orange-500/10 px-2 py-1 text-xs font-medium text-orange-600">
                <Flame className="h-3.5 w-3.5" />
                {streak}
              </div>
              <div className="flex items-center gap-1 rounded-md bg-amber-500/10 px-2 py-1 text-xs font-medium text-amber-600">
                <Zap className="h-3.5 w-3.5" />
                {xp} XP
              </div>
            </div>

            {/* Dark mode toggle */}
            <button
              onClick={() => setPref({ appearance: isDark ? 'light' : 'dark' })}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
              aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </button>

            {/* User avatar with dropdown (desktop) */}
            <UserMenu user={user} isDark={isDark} setPref={setPref} />

            {/* Hide bar button */}
            <button
              onClick={toggleHidden}
              className="hidden h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground lg:flex"
              aria-label="Hide top bar"
            >
              <ChevronUp className="h-4 w-4" />
            </button>

            {/* Mobile menu button */}
            <button
              onClick={toggleMobile}
              className="flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground md:hidden"
              aria-label="Open menu"
            >
              {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden" onClick={() => setMobileOpen(false)}>
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />
          <div
            className="absolute right-0 top-0 h-full w-72 max-w-[85vw] overflow-y-auto border-l border-border bg-background p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User card */}
            {user && (
              <div className="mb-4 rounded-lg border border-border bg-card p-3">
                <p className="text-sm font-semibold">{user.name}</p>
                <p className="text-xs text-muted-foreground">{user.email}</p>
                <div className="mt-2 flex gap-2">
                  <span className="rounded bg-orange-500/10 px-1.5 py-0.5 text-[10px] font-medium text-orange-600">
                    🔥 {streak} day streak
                  </span>
                  <span className="rounded bg-amber-500/10 px-1.5 py-0.5 text-[10px] font-medium text-amber-600">
                    ⚡ {xp} XP
                  </span>
                </div>
              </div>
            )}

            {/* All nav items */}
            <nav className="space-y-0.5">
              {NAV_ITEMS.map((item) => {
                const href = routeForView(item.key)
                const active = isActivePath(pathname, href)
                return (
                  <Link
                    key={item.key}
                    href={href}
                    prefetch={true}
                    onClick={() => {
                      useAppStore.getState().setView(item.key)
                      setMobileOpen(false)
                    }}
                    className={cn(
                      'flex items-center gap-2.5 rounded-md px-3 py-2 text-sm font-medium transition-colors',
                      active ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground',
                    )}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                )
              })}
            </nav>

            {/* Divider */}
            <div className="my-3 border-t border-border" />

            {/* Extra links */}
            <div className="space-y-0.5">
              {EXTRA_LINKS.map((link) => (
                <Link key={link.href} href={link.href} onClick={() => setMobileOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground">
                  <link.icon className="h-4 w-4" />
                  {link.label}
                </Link>
              ))}
            </div>

            {/* Quick actions */}
            <div className="space-y-0.5">
              <Link
                href="/settings"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <Settings className="h-4 w-4" />
                Settings
              </Link>
              <Link
                href="/feedback"
                onClick={() => setMobileOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                <MessageSquare className="h-4 w-4" />
                Send feedback
              </Link>
              <button
                onClick={() => setPref({ appearance: isDark ? 'light' : 'dark' })}
                className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
                {isDark ? 'Light mode' : 'Dark mode'}
              </button>
              {user && (
                <button
                  onClick={() => signOut({ callbackUrl: '/sign-in' })}
                  className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground"
                >
                  <LogOut className="h-4 w-4" />
                  Sign out
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}

// ─── User Menu (desktop dropdown with profile, settings, logout) ─────────────

import { useState as useState2, useRef as useRef2, useEffect as useEffect2 } from 'react'
import { ChevronDown as ChevronDown2 } from 'lucide-react'

function UserMenu({ user, isDark, setPref }: { user: { name: string; email: string } | null; isDark: boolean; setPref: (p: { appearance: string }) => void }) {
  const [open, setOpen] = useState2(false)
  const ref = useRef2<HTMLDivElement>(null)

  useEffect2(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  if (!user) return null

  const initials = user.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase()

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 rounded-md px-1.5 py-1 transition-colors hover:bg-accent"
        aria-label="User menu"
      >
        <span className="flex h-7 w-7 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
          {initials}
        </span>
        <ChevronDown2 className="hidden h-3 w-3 text-muted-foreground sm:block" />
      </button>

      {open && (
        <div className="absolute right-0 top-10 z-50 w-56 rounded-lg border border-border bg-popover shadow-lg">
          {/* User info */}
          <div className="border-b border-border p-3">
            <p className="text-sm font-semibold truncate">{user.name}</p>
            <p className="text-xs text-muted-foreground truncate">{user.email}</p>
          </div>

          {/* Menu items */}
          <div className="p-1.5 space-y-0.5">
            <Link href="/profile" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <User className="h-4 w-4" />
              Profile
            </Link>
            <Link href="/settings" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <Settings className="h-4 w-4" />
              Settings
            </Link>
            <Link href="/feedback" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <MessageSquare className="h-4 w-4" />
              Send Feedback
            </Link>
            <Link href="/help" onClick={() => setOpen(false)} className="flex items-center gap-2.5 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors">
              <HelpCircle className="h-4 w-4" />
              Help Center
            </Link>

            {/* Divider */}
            <div className="my-1 border-t border-border" />

            {/* Logout */}
            <button
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="flex w-full items-center gap-2.5 rounded-md px-3 py-2 text-sm text-red-600 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
