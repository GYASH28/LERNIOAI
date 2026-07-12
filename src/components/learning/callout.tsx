'use client'

import type { ReactNode } from 'react'
import {
  Info,
  AlertTriangle,
  Lightbulb,
  GraduationCap,
  BookOpen,
  Brain,
  type LucideIcon,
} from 'lucide-react'
import type { Callout as CalloutData } from '@/lib/curriculum/lesson-notes-loader'

const ICONS: Record<string, LucideIcon> = {
  info: Info,
  warning: AlertTriangle,
  tip: Lightbulb,
  example: BookOpen,
  definition: BookOpen,
  concept: Brain,
  'exam-tip': GraduationCap,
}

const DEFAULT_TITLES: Record<string, string> = {
  info: 'Note',
  warning: 'Warning',
  tip: 'Tip',
  example: 'Example',
  definition: 'Definition',
  concept: 'Key Concept',
  'exam-tip': 'Exam Tip',
}

export function Callout({
  type,
  title,
  content,
  children,
}: {
  type: string
  title?: string
  content?: string
  children?: ReactNode
}) {
  const Icon = ICONS[type] ?? Info
  const resolvedTitle = title ?? DEFAULT_TITLES[type] ?? 'Note'
  return (
    <div className={`callout callout--${type}`}>
      <span className="callout__icon" aria-hidden>
        <Icon className="h-4 w-4" />
      </span>
      <div className="callout__body">
        <span className="callout__title">{resolvedTitle}</span>
        <div>{content ?? children}</div>
      </div>
    </div>
  )
}

export function CalloutList({ callouts }: { callouts: CalloutData[] }) {
  return (
    <>
      {callouts.map((c, i) => (
        <Callout key={i} type={c.type} title={c.title} content={c.content} />
      ))}
    </>
  )
}
