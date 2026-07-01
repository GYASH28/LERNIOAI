'use client'

import { useEffect, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Command } from 'cmdk'
import {
  Search,
  Home,
  BookOpen,
  MessageSquare,
  Calendar,
  BarChart3,
  Settings,
  HelpCircle, Bell, Trophy,
  Moon,
  Sun,
  type LucideIcon,
} from 'lucide-react'
import { usePrefs } from '@/components/theme-provider'

interface CommandItem {
  id: string
  label: string
  hint?: string
  icon: LucideIcon
  action: () => void
  group: 'navigate' | 'quick' | 'settings'
}

/**
 * Global Command Palette (Cmd+K / Ctrl+K).
 *
 * High-impact UX feature: lets power users jump to any page or trigger any
 * action without touching the mouse. Uses the `cmdk` library (already a
 * dependency) and Radix UI Dialog for accessibility.
 */
export function CommandPalette() {
  const [open, setOpen] = useState(false)
  const router = useRouter()
  const { pref, setPref } = usePrefs()

  // Toggle palette on Cmd+K (Mac) / Ctrl+K (Win/Linux)
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen((prev) => !prev)
      }
      // Esc to close (cmdk handles this internally, but also handle here)
      if (e.key === 'Escape' && open) {
        setOpen(false)
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open])

  const navigate = useCallback(
    (path: string) => {
      router.push(path)
      setOpen(false)
    },
    [router],
  )

  const toggleTheme = useCallback(() => {
    const next = pref.appearance === 'dark' ? 'light' : 'dark'
    setPref({ appearance: next })
    setOpen(false)
  }, [pref.appearance, setPref])

  const items: CommandItem[] = [
    // Navigate
    { id: 'nav-dashboard', label: 'Dashboard', icon: Home, action: () => navigate('/dashboard'), group: 'navigate' },
    { id: 'nav-learn', label: 'Browse lessons', icon: BookOpen, action: () => navigate('/learn'), group: 'navigate' },
    { id: 'nav-tutor', label: 'AI Tutor', icon: MessageSquare, action: () => navigate('/tutor'), group: 'navigate' },
    { id: 'nav-planner', label: 'Study planner', icon: Calendar, action: () => navigate('/planner'), group: 'navigate' },
    { id: 'nav-analytics', label: 'Analytics', icon: BarChart3, action: () => navigate('/analytics'), group: 'navigate' },
    { id: 'nav-exams', label: 'Exams & quizzes', icon: BookOpen, action: () => navigate('/exams'), group: 'navigate' },
    { id: 'nav-revision', label: 'Revision', icon: BookOpen, action: () => navigate('/revision'), group: 'navigate' },
    { id: 'nav-coding', label: 'Coding lab', icon: BookOpen, action: () => navigate('/coding'), group: 'navigate' },
    { id: 'nav-achievements', label: 'Achievements', icon: Trophy, action: () => navigate('/achievements'), group: 'navigate' },
    { id: 'nav-notifications', label: 'Notifications', icon: Bell, action: () => navigate('/notifications'), group: 'navigate' },
    // Quick actions
    {
      id: 'quick-theme',
      label: pref.appearance === 'dark' ? 'Switch to light mode' : 'Switch to dark mode',
      icon: pref.appearance === 'dark' ? Sun : Moon,
      action: toggleTheme,
      group: 'quick',
    },
    // Settings
    { id: 'set-settings', label: 'Settings', icon: Settings, action: () => navigate('/settings'), group: 'settings' },
    { id: 'set-help', label: 'Help & support', icon: HelpCircle, Bell, Trophy, action: () => navigate('/support'), group: 'settings' },
  ]

  const grouped = items.reduce<Record<string, CommandItem[]>>((acc, item) => {
    if (!acc[item.group]) acc[item.group] = []
    acc[item.group].push(item)
    return acc
  }, {})

  const groupLabels: Record<string, string> = {
    navigate: 'Navigate',
    quick: 'Quick actions',
    settings: 'Settings',
  }

  if (!open) return null

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/50 backdrop-blur-sm pt-[15vh] px-4"
      onClick={() => setOpen(false)}
      role="dialog"
      aria-modal="true"
      aria-label="Command palette"
    >
      <Command
        loop
        className="w-full max-w-xl rounded-xl border border-border bg-popover shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center gap-2 border-b border-border px-3">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
          <Command.Input
            placeholder="Search pages and actions..."
            className="h-11 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            autoFocus
          />
        </div>
        <Command.List className="max-h-[50vh] overflow-y-auto p-1">
          <Command.Empty className="py-6 text-center text-sm text-muted-foreground">
            No results found.
          </Command.Empty>
          {Object.entries(grouped).map(([group, groupItems]) => (
            <Command.Group key={group} heading={groupLabels[group]} className="text-xs text-muted-foreground">
              {groupItems.map((item) => (
                <Command.Item
                  key={item.id}
                  value={`${item.label} ${item.hint ?? ''}`}
                  onSelect={() => item.action()}
                  className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer aria-selected:bg-accent aria-selected:text-accent-foreground"
                >
                  <item.icon className="h-4 w-4 text-muted-foreground shrink-0" aria-hidden="true" />
                  <span className="flex-1">{item.label}</span>
                  {item.hint && <span className="text-xs text-muted-foreground">{item.hint}</span>}
                </Command.Item>
              ))}
            </Command.Group>
          ))}
        </Command.List>
        <div className="border-t border-border px-3 py-1.5 text-[10px] text-muted-foreground flex items-center justify-between">
          <span>↑↓ to navigate · Enter to select · Esc to close</span>
          <span className="font-mono">⌘K</span>
        </div>
      </Command>
    </div>
  )
}
