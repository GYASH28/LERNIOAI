'use client'

import { MermaidDiagram } from './mermaid-diagram'
import type { Diagram } from '@/lib/curriculum/lesson-notes-loader'

/**
 * Renders a Diagram object — auto-detects Mermaid vs ASCII.
 * Mermaid diagrams start with one of: graph, flowchart, sequenceDiagram,
 * classDiagram, stateDiagram, mindmap, erDiagram, gantt, pie, journey.
 */
export function DiagramRenderer({ diagram }: { diagram: Diagram }) {
  const content = (diagram.content || '').trim()
  const isMermaid = /^(graph|flowchart|sequenceDiagram|classDiagram|stateDiagram|erDiagram|gantt|pie|journey|mindmap|gitGraph|requirementDiagram)\b/i.test(
    content,
  ) || diagram.type === 'mermaid'

  if (isMermaid) {
    return <MermaidDiagram source={content} title={diagram.title} />
  }

  // ASCII / text diagram
  return (
    <div className="mermaid-wrapper">
      <div className="mermaid-wrapper__title">{diagram.title}</div>
      <pre className="m-0 overflow-x-auto whitespace-pre text-xs font-mono leading-relaxed text-foreground">
        {content}
      </pre>
    </div>
  )
}
