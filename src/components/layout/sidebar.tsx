'use client'

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
  ShieldCheck,
  Sun,
  Moon,
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'
import { Button } from '@/components/ui/button'
import { routeForView } from '@/lib/routes'
import { usePrefs } from '@/components/theme-provider'

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

const MOBILE_PRIMARY: ViewKey[] = ['dashboard', 'learn', 'practice', 'tutor']

const AUTHORITY_ROUTES: Record<string, { href: string; label: string }> = {
  admin: { href: '/admin', label: 'Admin workspace' },
  coordinator: { href: '/coordinator', label: 'Coordinator workspace' },
  teacher: { href: '/teacher', label: 'Teacher workspace' },
  reviewer: { href: '/reviewer', label: 'Reviewer workspace' },
  moderator: { href: '/moderator', label: 'Moderator workspace' },
  cr: { href: '/cr', label: 'CR workspace' },
}

function isActivePath(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function Sidebar() {
  const pathname = usePathname()
  const { sidebarOpen, setSidebarOpen, user, xp, streak } = useAppStore()

  return (
    <>
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}
      <aside
        className={cn(
          'fixed top-0 z-50 flex h-screen w-72 shrink-0 flex-col border-r border-sidebar-border bg-sidebar transition-[transform,width] duration-300 md:sticky md:z-30 md:w-[var(--sidebar-collapsed)] xl:w-[var(--sidebar-expanded)]',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
        )}
      >
        <div className="relative flex items-center justify-start gap-3 overflow-hidden border-b border-sidebar-border p-4 md:justify-center xl:justify-start">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl"
          />
          <LernioLogoTile size="md" className="relative" />
          <div className="relative min-w-0 flex-1 md:hidden xl:block">
            <h1 className="text-lg font-bold leading-tight text-foreground">
              Lernio AI
            </h1>
            <p className="text-meta uppercase tracking-wider text-muted-foreground">
              Learning OS 2.0
            </p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 md:hidden"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {user ? (
          <div className="border-b border-sidebar-border p-3">
            <div className="flex items-center justify-center gap-2 rounded-lg bg-sidebar-accent/50 p-2 xl:justify-start">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">
                {user.name.charAt(0)}
              </div>
              <div className="min-w-0 flex-1 md:hidden xl:block">
                <p className="truncate text-sm font-medium">{user.name}</p>
                <p className="text-meta truncate text-muted-foreground">
                  {user.email}
                </p>
              </div>
            </div>
            <div className="mt-2 hidden gap-2 xl:flex">
              <div className="flex flex-1 items-center gap-1.5 rounded-md bg-warning/10 px-2 py-1">
                <Flame className="h-3.5 w-3.5 text-warning" />
                <span className="text-xs font-semibold">
                  {streak || user.streak} day
                </span>
              </div>
              <div className="flex flex-1 items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">{xp || user.xp} XP</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="border-b border-sidebar-border p-3">
            <div className="rounded-lg border border-sidebar-border/50 bg-sidebar-accent/30 p-3 text-center">
              <p className="mb-3 hidden text-xs leading-relaxed text-muted-foreground xl:block">
                Sign in to unlock personalized study plans, trace your mastery,
                and learn with LEO.
              </p>
              <Button size="sm" asChild className="w-full gap-2 shadow-sm">
                <Link href="/sign-in">
                  <User className="h-4 w-4" />
                  <span className="md:hidden xl:inline">Sign In</span>
                </Link>
              </Button>
            </div>
          </div>
        )}

        <nav className="scroll-area-lernio flex-1 space-y-0.5 overflow-y-auto p-3">
          <p className="px-2 py-1.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground md:sr-only xl:not-sr-only">
            Menu
          </p>
          {NAV_ITEMS.slice(0, 8).map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={isActivePath(pathname, routeForView(item.key))}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
          <p className="mt-2 px-2 py-1.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground md:sr-only xl:not-sr-only">
            Tools
          </p>
          {NAV_ITEMS.slice(8).map((item) => (
            <NavItem
              key={item.key}
              item={item}
              active={isActivePath(pathname, routeForView(item.key))}
              onNavigate={() => setSidebarOpen(false)}
            />
          ))}
          {user?.role && AUTHORITY_ROUTES[user.role] ? (
            <>
              <p className="mt-2 px-2 py-1.5 text-meta font-semibold uppercase tracking-wider text-muted-foreground md:sr-only xl:not-sr-only">
                Authority
              </p>
              <Link
                href={AUTHORITY_ROUTES[user.role].href}
                onClick={() => setSidebarOpen(false)}
                title={AUTHORITY_ROUTES[user.role].label}
                className={cn(
                  'focus-ring group relative flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all xl:justify-start',
                  isActivePath(pathname, AUTHORITY_ROUTES[user.role].href)
                    ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft'
                    : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
                )}
              >
                <ShieldCheck className="h-4 w-4 shrink-0" />
                <span className="hidden flex-1 text-left xl:block">{AUTHORITY_ROUTES[user.role].label}</span>
              </Link>
            </>
          ) : null}
        </nav>

        <div className="space-y-1 border-t border-sidebar-border p-3">
          <button
            type="button"
            onClick={() => {
              window.dispatchEvent(
                new KeyboardEvent('keydown', {
                  key: 'k',
                  metaKey: navigator.platform.includes('Mac'),
                  ctrlKey: !navigator.platform.includes('Mac'),
                }),
              )
            }}
            className="group flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground xl:justify-between"
            aria-label="Quick search"
            title="Quick search"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              <span className="md:hidden xl:inline">Quick search</span>
            </span>
            <kbd className="hidden rounded border border-sidebar-border px-1 py-0.5 font-mono text-[11px] group-hover:border-sidebar-accent-foreground/30 xl:inline">
              Ctrl K
            </kbd>
          </button>
          <Link
            href={routeForView('profile')}
            onClick={() => setSidebarOpen(false)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground xl:justify-start"
            title="Settings and preferences"
          >
            <Settings className="h-4 w-4" />
            <span className="md:hidden xl:inline">Settings and preferences</span>
          </Link>
          <ThemeToggleSidebar />
          {user && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground xl:justify-start"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
              <span className="md:hidden xl:inline">Sign out</span>
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

function NavItem({
  item,
  active,
  onNavigate,
}: {
  item: { key: ViewKey; label: string; icon: typeof BookOpen }
  active: boolean
  onNavigate: () => void
}) {
  const Icon = item.icon
  const setView = useAppStore((s) => s.setView)
  return (
    <Link
      href={routeForView(item.key)}
      prefetch={false}
      onClick={() => {
        setView(item.key)
        onNavigate()
      }}
      title={item.label}
      className={cn(
        'focus-ring group relative flex w-full items-center justify-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all xl:justify-start',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
      )}
      aria-current={active ? 'page' : undefined}
    >
      {active && (
        <span
          aria-hidden="true"
          className="absolute left-0 top-1/2 h-6 w-1 -translate-y-1/2 rounded-r-full bg-sidebar-primary-foreground/90"
        />
      )}
      <Icon
        className={cn(
          'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
          active
            ? 'text-sidebar-primary-foreground'
            : 'text-muted-foreground group-hover:text-sidebar-accent-foreground',
        )}
      />
      <span className="hidden flex-1 text-left xl:block">{item.label}</span>
      {active && (
        <span className="hidden h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80 xl:block" />
      )}
    </Link>
  )
}

export function MobileNav() {
  const pathname = usePathname()
  const items = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.key))

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 md:hidden">
      <div className="flex h-16 items-center justify-around px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = isActivePath(pathname, routeForView(item.key))
          return (
            <Link
              key={item.key}
              href={routeForView(item.key)}
              prefetch={false}
              onClick={() => useAppStore.getState().setView(item.key)}
              className={cn(
                'flex min-w-[56px] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 transition-colors',
                active ? 'text-primary' : 'text-muted-foreground',
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-meta font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => useAppStore.getState().setSidebarOpen(true)}
          className="flex min-w-[56px] flex-col items-center gap-0.5 rounded-lg px-3 py-1.5 text-muted-foreground"
          aria-label="Open full navigation"
        >
          <Menu className="h-5 w-5" />
          <span className="text-meta font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}

// ─── Dark mode toggle for sidebar ───────────────────────────────────────────
// Uses the existing ThemeProvider's usePrefs() to toggle between light/dark.

function ThemeToggleSidebar() {
  const { pref, setPref } = usePrefs()
  const isDark = pref.appearance === 'dark'

  return (
    <button
      type="button"
      onClick={() => setPref({ appearance: isDark ? 'light' : 'dark' })}
      className="flex w-full items-center justify-center gap-2 rounded-lg px-2 py-1.5 text-sm text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground xl:justify-start"
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      aria-label={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
      <span className="md:hidden xl:inline">{isDark ? 'Light mode' : 'Dark mode'}</span>
    </button>
  )
}
