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
  RotateCw,
  Settings,
  Target,
  User,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { LernioLogoTile } from '@/components/brand/lernio-logo'
import { useAppStore } from '@/store/app-store'

const items = [
  { href: '/dashboard', label: 'Home', icon: Home },
  { href: '/learn', label: 'Learn', icon: BookOpen },
  { href: '/practice', label: 'Practice', icon: Target },
  { href: '/exams', label: 'Tests', icon: FileText },
  { href: '/tutor', label: 'AI Tutor', icon: Bot },
  { href: '/revision', label: 'Revision', icon: RotateCw },
  { href: '/planner', label: 'Planner', icon: CalendarCheck },
  { href: '/analytics', label: 'Analytics', icon: BarChart3 },
  { href: '/materials', label: 'Resources', icon: Library },
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
]

function active(pathname: string, href: string) {
  return href === '/dashboard' ? pathname === href : pathname.startsWith(href)
}

export function Sidebar() {
  const pathname = usePathname() || '/'
  const open = useAppStore((state) => state.sidebarOpen)
  const setOpen = useAppStore((state) => state.setSidebarOpen)

  return (
    <>
      {open && <button type="button" aria-label="Close navigation" className="fixed inset-0 z-40 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
      <aside className={cn('fixed inset-y-0 left-0 z-50 flex w-72 flex-col border-r border-border bg-background transition-transform md:sticky md:top-0 md:z-20 md:h-screen md:w-20 md:translate-x-0 xl:w-64', open ? 'translate-x-0' : '-translate-x-full')}>
        <div className="flex h-16 items-center gap-3 border-b border-border px-4 md:justify-center xl:justify-start">
          <LernioLogoTile className="h-8 w-8" />
          <div className="md:hidden xl:block"><p className="font-bold">Lernio AI</p><p className="text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Learning OS</p></div>
          <button type="button" className="ml-auto md:hidden" aria-label="Close sidebar" onClick={() => setOpen(false)}><X className="h-5 w-5" /></button>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {items.map((item) => <Link key={item.href} href={item.href} onClick={() => setOpen(false)} className={cn('flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-colors md:justify-center xl:justify-start', active(pathname, item.href) ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-accent hover:text-foreground')} title={item.label}><item.icon className="h-4 w-4 shrink-0" /><span className="md:hidden xl:inline">{item.label}</span></Link>)}
        </nav>
        <div className="border-t border-border p-3"><button type="button" onClick={() => signOut({ callbackUrl: '/sign-in' })} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-accent hover:text-foreground md:justify-center xl:justify-start"><LogOut className="h-4 w-4" /><span className="md:hidden xl:inline">Sign out</span></button></div>
      </aside>
    </>
  )
}
