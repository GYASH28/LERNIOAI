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
import { cn } from '@/lib/utils'

export type LearningWorkflowKey =
  | 'learn'
  | 'practice'
  | 'revision'
  | 'tutor'
  | 'notebook'
  | 'planner'
  | 'coding'

const links = [
  { key: 'learn', href: '/learn/current', label: 'Continue', icon: BookOpen },
  { key: 'practice', href: '/practice', label: 'Practice', icon: PenTool },
  { key: 'revision', href: '/revision', label: 'Revision', icon: RotateCcw },
  { key: 'tutor', href: '/tutor', label: 'LEO', icon: BrainCircuit },
  { key: 'notebook', href: '/notebook', label: 'Notebook', icon: LibraryBig },
  { key: 'planner', href: '/planner', label: 'Planner', icon: CalendarCheck },
  { key: 'coding', href: '/coding', label: 'Coding', icon: Code2 },
] as const

export function LearningWorkflowNav({ current }: { current?: LearningWorkflowKey }) {
  return (
    <nav
      aria-label="Learning workflow"
      className="hidden border-b border-border/70 bg-background/92 md:block"
    >
      <div className="mx-auto flex max-w-7xl items-center gap-1 overflow-x-auto px-6 py-2 lg:px-8">
        {links.map((item) => {
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
  )
}
