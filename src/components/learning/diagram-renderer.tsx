'use client'
import type { Diagram } from '@/lib/curriculum/lesson-notes-loader'

export function DiagramRenderer({ diagram }: { diagram: Diagram }) {
  const content = (diagram.content || '').trim()
  return (
    <div className="native-diagram">
      <div className="native-diagram__title">{diagram.title}</div>
      <pre className="native-diagram__pre">{content}</pre>
    </div>
  )
}
