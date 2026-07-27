'use client'
import type { ReactNode } from 'react'
import { Info, AlertTriangle, Lightbulb, GraduationCap, BookOpen } from 'lucide-react'

const ICONS: Record<string, typeof Info> = { info: Info, warning: AlertTriangle, tip: Lightbulb, example: BookOpen, definition: BookOpen, concept: Lightbulb, 'exam-tip': GraduationCap }
const TITLES: Record<string, string> = { info: 'Note', warning: 'Warning', tip: 'Tip', example: 'Example', definition: 'Definition', concept: 'Key Concept', 'exam-tip': 'Exam Tip' }

export function Callout({ type, title, content, children }: { type: string; title?: string; content?: string; children?: ReactNode }) {
  const Icon = ICONS[type] ?? Info
  const t = title ?? TITLES[type] ?? 'Note'
  return (
    <div className={`callout callout--${type}`}>
      <span className="callout__icon" aria-hidden><Icon className="h-4 w-4"/></span>
      <div className="callout__body"><span className="callout__title">{t}</span><div>{content ?? children}</div></div>
    </div>
  )
}
export function CalloutList({ callouts }: { callouts: Array<{ type: string; title?: string; content: string }> }) {
  return <>{callouts.map((c, i) => <Callout key={i} type={c.type} title={c.title} content={c.content}/>)}</>
}
