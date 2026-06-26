'use client'

import type { ReactNode } from 'react'
import { useMemo, useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import type { LucideIcon } from 'lucide-react'
import {
  BarChart3,
  BookOpenCheck,
  Building2,
  CalendarDays,
  ChevronRight,
  ClipboardCheck,
  Command,
  Database,
  FileScan,
  GraduationCap,
  History,
  Layers3,
  LibraryBig,
  LockKeyhole,
  MailPlus,
  Menu,
  Network,
  PanelLeftClose,
  PlugZap,
  Search,
  Settings2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  UserCheck,
  Users,
  UsersRound,
  Workflow,
  X,
} from 'lucide-react'
import { CAMPUSMATE_ADMIN_ITEMS, CAMPUSMATE_ADMIN_NAV, getAdminNavItem } from '@/lib/admin/campusmate-navigation'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/button'
import { LernioLogoTile } from '@/components/brand/lernio-logo'

type AdminShellProps = {
  children: ReactNode
  user: { name: string; email: string }
}

const ICONS: Record<string, LucideIcon> = {
  command: Command,
  analytics: BarChart3,
  users: Users,
  shield: ShieldCheck,
  mail: MailPlus,
  'user-check': UserCheck,
  building: Building2,
  network: Network,
  graduation: GraduationCap,
  layers: Layers3,
  calendar: CalendarDays,
  classes: UsersRound,
  database: Database,
  upload: UploadCloud,
  scan: FileScan,
  book: BookOpenCheck,
  library: LibraryBig,
  workflow: Workflow,
  clipboard: ClipboardCheck,
  history: History,
  lock: LockKeyhole,
  sparkles: Sparkles,
  plug: PlugZap,
  settings: Settings2,
}

export function CampusmateAdminShell({ children, user }: AdminShellProps) {
  const pathname = usePathname() || '/admin'
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [collapsed, setCollapsed] = useState(false)
  const [query, setQuery] = useState('')
  const current = getAdminNavItem(pathname)

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase()
    if (!term) return []
    return CAMPUSMATE_ADMIN_ITEMS.filter((item) =>
      `${item.label} ${item.description}`.toLowerCase().includes(term),
    ).slice(0, 7)
  }, [query])

  function goTo(href: string) {
    setQuery('')
    setMobileOpen(false)
    router.push(href)
  }

  return (
    <div className="min-h-screen bg-muted/20 text-foreground">
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation overlay"
          className="fixed inset-0 z-40 bg-black/45 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      ) : null}

      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex flex-col border-r border-border/70 bg-card shadow-xl transition-[width,transform] duration-300',
          collapsed ? 'w-[84px]' : 'w-[292px]',
          mobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0',
        )}
      >
        <div className="flex h-20 items-center gap-3 border-b border-border/70 px-4">
          <Link href="/admin" className="flex min-w-0 flex-1 items-center gap-3" onClick={() => setMobileOpen(false)}>
            <LernioLogoTile size="md" />
            {!collapsed ? (
              <span className="min-w-0">
                <span className="block truncate text-base font-black tracking-tight">Lernio Management</span>
                <span className="block truncate text-xs font-medium text-muted-foreground">CWIT · Admin Console</span>
              </span>
            ) : null}
          </Link>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setMobileOpen(false)}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="border-b border-border/70 p-3">
          <div className={cn('rounded-xl border border-primary/15 bg-primary/5 p-3', collapsed && 'px-2 text-center')}>
            <div className={cn('flex items-center gap-3', collapsed && 'justify-center')}>
              <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary text-sm font-black text-primary-foreground">
                {user.name.slice(0, 1).toUpperCase()}
              </div>
              {!collapsed ? (
                <div className="min-w-0">
                  <p className="truncate text-sm font-bold">{user.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{user.email}</p>
                </div>
              ) : null}
            </div>
            {!collapsed ? (
              <div className="mt-3 flex items-center justify-between rounded-lg bg-background/80 px-3 py-2 text-xs">
                <span className="text-muted-foreground">Authority</span>
                <span className="font-bold text-primary">Institution Admin</span>
              </div>
            ) : null}
          </div>
        </div>

        <nav className="scroll-area-lernio flex-1 overflow-y-auto p-3" aria-label="Admin management navigation">
          {CAMPUSMATE_ADMIN_NAV.map((group) => (
            <div key={group.label} className="mb-5">
              {!collapsed ? (
                <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-[0.18em] text-muted-foreground">
                  {group.label}
                </p>
              ) : null}
              <div className="space-y-1">
                {group.items.map((item) => {
                  const Icon = ICONS[item.icon] ?? Command
                  const active = item.href === '/admin'
                    ? pathname === '/admin'
                    : pathname === item.href || pathname.startsWith(`${item.href}/`)
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      title={collapsed ? item.label : undefined}
                      onClick={() => setMobileOpen(false)}
                      className={cn(
                        'group flex min-h-10 items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition-colors',
                        collapsed && 'justify-center px-2',
                        active
                          ? 'bg-primary text-primary-foreground shadow-sm'
                          : 'text-muted-foreground hover:bg-muted hover:text-foreground',
                      )}
                    >
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
                      {!collapsed && active ? <ChevronRight className="h-3.5 w-3.5" /> : null}
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </nav>

        <div className="hidden border-t border-border/70 p-3 lg:block">
          <Button
            type="button"
            variant="ghost"
            className={cn('w-full', collapsed ? 'justify-center px-2' : 'justify-start')}
            onClick={() => setCollapsed((value) => !value)}
          >
            <PanelLeftClose className={cn('h-4 w-4 transition-transform', collapsed && 'rotate-180')} />
            {!collapsed ? 'Collapse navigation' : null}
          </Button>
        </div>
      </aside>

      <div className={cn('min-h-screen transition-[padding] duration-300', collapsed ? 'lg:pl-[84px]' : 'lg:pl-[292px]')}>
        <header className="sticky top-0 z-30 border-b border-border/70 bg-background/90 backdrop-blur-xl">
          <div className="flex h-20 items-center gap-3 px-4 sm:px-6 lg:px-8">
            <Button variant="outline" size="icon" className="lg:hidden" onClick={() => setMobileOpen(true)}>
              <Menu className="h-4 w-4" />
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-xs font-semibold uppercase tracking-wider text-muted-foreground">Admin Management System</p>
              <h1 className="truncate text-lg font-black tracking-tight">{current.label}</h1>
            </div>

            <div className="relative hidden w-full max-w-md md:block">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && matches[0]) goTo(matches[0].href)
                  if (event.key === 'Escape') setQuery('')
                }}
                placeholder="Search management modules…"
                className="h-11 w-full rounded-xl border border-input bg-background pl-10 pr-4 text-sm outline-none ring-offset-background placeholder:text-muted-foreground focus:ring-2 focus:ring-ring"
                aria-label="Search management modules"
              />
              {query.trim() ? (
                <div className="absolute left-0 right-0 top-12 z-50 overflow-hidden rounded-xl border border-border bg-popover p-2 shadow-2xl">
                  {matches.length ? matches.map((item) => {
                    const Icon = ICONS[item.icon] ?? Command
                    return (
                      <button
                        key={item.href}
                        type="button"
                        onClick={() => goTo(item.href)}
                        className="flex w-full items-start gap-3 rounded-lg px-3 py-2 text-left hover:bg-muted"
                      >
                        <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                        <span><span className="block text-sm font-bold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.description}</span></span>
                      </button>
                    )
                  }) : <p className="px-3 py-4 text-sm text-muted-foreground">No management module found.</p>}
                </div>
              ) : null}
            </div>

            <Button asChild variant="outline" className="hidden sm:inline-flex">
              <Link href="/tutor"><Sparkles className="h-4 w-4" />Open LEO</Link>
            </Button>
            <Button asChild variant="outline" size="icon" title="Audit Explorer">
              <Link href="/admin/audit"><History className="h-4 w-4" /></Link>
            </Button>
          </div>
        </header>

        <main>{children}</main>
      </div>
    </div>
  )
}
