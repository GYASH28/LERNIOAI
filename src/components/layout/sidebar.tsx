'use client'

import Link from 'next/link'
import { signOut } from 'next-auth/react'
import { useAppStore } from '@/store/app-store'
import { cn } from '@/lib/utils'
import { Mascot } from '@/components/mascots/mascot'
import {
  LayoutDashboard, BookOpen, PenTool, Bot, FlaskConical, Code2,
  FileText, RotateCw, Library, CalendarCheck, BarChart3, User,
  Menu, X, Flame, Zap, Settings, Search, LogOut
} from 'lucide-react'
import type { ViewKey } from '@/lib/types'
import { usePrefs } from '@/components/theme-provider'
import { Button } from '@/components/ui/button'
import { routeForView } from '@/lib/routes'

const NAV_ITEMS: { key: ViewKey; label: string; icon: typeof BookOpen; group?: string }[] = [
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

export function Sidebar() {
  const { view, setView, sidebarOpen, setSidebarOpen, user, xp, streak } = useAppStore()
  const { pref } = usePrefs()

  return (
    <>
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      <aside
        className={cn(
          'fixed md:sticky top-0 z-50 md:z-30 h-screen w-72 shrink-0 border-r border-sidebar-border bg-sidebar flex flex-col transition-transform duration-300',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 p-4 border-b border-sidebar-border relative overflow-hidden">
          <div aria-hidden className="absolute -top-6 -right-6 h-24 w-24 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
          <div className="relative">
            <Mascot mascot="leo" state="idle" size={40} animated={!pref.reducedMotion} />
          </div>
          <div className="flex-1 min-w-0 relative">
            <h1 className="font-bold text-lg leading-tight text-foreground">
              Lernio AI
            </h1>
            <p className="text-meta text-muted-foreground uppercase tracking-wider">Learning OS 2.0</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-8 w-8"
            onClick={() => setSidebarOpen(false)}
            aria-label="Close sidebar"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* User chip */}
        {user ? (
          <div className="p-3 border-b border-sidebar-border">
            <div className="flex items-center gap-2 rounded-lg bg-sidebar-accent/50 p-2">
              <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-primary-foreground text-sm font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user.name}</p>
                <p className="text-meta text-muted-foreground truncate">{user.email}</p>
              </div>
            </div>
            <div className="flex gap-2 mt-2">
              <div className="flex-1 flex items-center gap-1.5 rounded-md bg-amber-500/10 px-2 py-1">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
                <span className="text-xs font-semibold">{streak || user.streak} day</span>
              </div>
              <div className="flex-1 flex items-center gap-1.5 rounded-md bg-primary/10 px-2 py-1">
                <Zap className="h-3.5 w-3.5 text-primary" />
                <span className="text-xs font-semibold">{xp || user.xp} XP</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 border-b border-sidebar-border">
            <div className="rounded-lg bg-sidebar-accent/30 border border-sidebar-border/50 p-4 text-center">
              <p className="text-xs text-muted-foreground mb-3 leading-relaxed">Sign in to unlock personalized study plans, trace your mastery, and learn with LEO.</p>
              <Link href="/sign-in" className="w-full block">
                <Button size="sm" className="w-full gap-2 shadow-sm font-medium">
                  <User className="h-4 w-4" />
                  Sign In
                </Button>
              </Link>
            </div>
          </div>
        )}

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto scroll-area-lernio p-3 space-y-0.5">
          <p className="px-2 py-1.5 text-meta font-semibold text-muted-foreground uppercase tracking-wider">Menu</p>
          {NAV_ITEMS.slice(0, 8).map((item) => (
            <NavItem key={item.key} item={item} active={view === item.key} onClick={() => { setView(item.key); setSidebarOpen(false) }} />
          ))}
          <p className="px-2 py-1.5 mt-2 text-meta font-semibold text-muted-foreground uppercase tracking-wider">Tools</p>
          {NAV_ITEMS.slice(8).map((item) => (
            <NavItem key={item.key} item={item} active={view === item.key} onClick={() => { setView(item.key); setSidebarOpen(false) }} />
          ))}
        </nav>

        {/* Footer */}
        <div className="p-3 border-t border-sidebar-border space-y-1">
          <button
            onClick={() => {
              // Trigger the global Cmd+K handler
              window.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true, ctrlKey: navigator.platform.includes('Mac') ? false : true }))
            }}
            className="flex items-center justify-between gap-2 w-full rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors group"
          >
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" />
              Quick search
            </span>
            <kbd className="text-[11px] font-mono border border-sidebar-border rounded px-1 py-0.5 group-hover:border-sidebar-accent-foreground/30">
              ⌘K
            </kbd>
          </button>
          <Link
            href={routeForView('profile')}
            onClick={() => { setView('profile'); setSidebarOpen(false) }}
            className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
          >
            <Settings className="h-4 w-4" />
            Settings & Preferences
          </Link>
          {user && (
            <button
              type="button"
              onClick={() => signOut({ callbackUrl: '/sign-in' })}
              className="flex items-center gap-2 w-full rounded-lg px-2 py-1.5 text-sm text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          )}
        </div>
      </aside>
    </>
  )
}

function NavItem({ item, active, onClick }: { item: { key: ViewKey; label: string; icon: typeof BookOpen }; active: boolean; onClick: () => void }) {
  const Icon = item.icon
  return (
    <Link
      href={routeForView(item.key)}
      onClick={onClick}
      className={cn(
        'flex items-center gap-3 w-full rounded-lg px-3 py-2 text-sm font-medium transition-all relative group focus-ring',
        active
          ? 'bg-sidebar-primary text-sidebar-primary-foreground shadow-soft'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground'
      )}
      aria-current={active ? 'page' : undefined}
    >
      {/* Animated active indicator stripe (left edge) */}
      {active && (
        <span
          aria-hidden
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-1 rounded-r-full bg-sidebar-primary-foreground/90"
          style={{ animation: 'slide-in-left 0.24s cubic-bezier(0.16, 1, 0.3, 1) both' }}
        />
      )}
      <Icon className={cn('h-4 w-4 shrink-0 transition-transform group-hover:scale-110', active ? 'text-sidebar-primary-foreground' : 'text-muted-foreground group-hover:text-sidebar-accent-foreground')} />
      <span className="flex-1 text-left">{item.label}</span>
      {active && <span className="h-1.5 w-1.5 rounded-full bg-sidebar-primary-foreground/80 animate-pop-in" />}
    </Link>
  )
}

export function MobileNav() {
  const { view, setView } = useAppStore()
  const items = NAV_ITEMS.filter((i) => MOBILE_PRIMARY.includes(i.key))
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-40 border-t border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80">
      <div className="flex items-center justify-around h-16 px-2">
        {items.map((item) => {
          const Icon = item.icon
          const active = view === item.key
          return (
            <Link
              key={item.key}
              href={routeForView(item.key)}
              onClick={() => setView(item.key)}
              className={cn(
                'flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] transition-colors',
                active ? 'text-primary' : 'text-muted-foreground'
              )}
              aria-current={active ? 'page' : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="text-meta font-medium">{item.label}</span>
            </Link>
          )
        })}
        <button
          onClick={() => useAppStore.getState().setSidebarOpen(true)}
          className="flex flex-col items-center gap-0.5 px-3 py-1.5 rounded-lg min-w-[56px] text-muted-foreground"
        >
          <Menu className="h-5 w-5" />
          <span className="text-meta font-medium">More</span>
        </button>
      </div>
    </nav>
  )
}
