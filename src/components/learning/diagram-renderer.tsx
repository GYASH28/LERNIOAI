'use client'

import { NativeFlowchart } from './native-flowchart'
import { NativeMindmap } from './native-mindmap'
import type { Diagram } from '@/lib/curriculum/lesson-notes-loader'

/**
 * Renders a Diagram object — auto-detects type and uses the appropriate
 * native HTML/CSS visualizer.
 *
 * NO Mermaid is used. This eliminates all "Syntax error in text" and
 * Mermaid rendering failures by design. Every diagram either renders as
 * a native HTML/CSS component, or falls back to a styled <pre> block.
 *
 * Supported:
 *   - flowchart TD/LR  → NativeFlowchart (HTML/CSS boxes + arrows)
 *   - mindmap          → NativeMindmap (indented tree)
 *   - ascii / text     → styled <pre> (preserved whitespace)
 */
export function DiagramRenderer({ diagram }: { diagram: Diagram }) {
  const content = (diagram.content || '').trim()
  const type = (diagram.type || '').toLowerCase()

  // Detect mermaid flowchart
  if (type === 'mermaid' || /^flowchart\s+(TD|LR|TB|RL|BT)/i.test(content)) {
    return <NativeFlowchart source={content} title={diagram.title} />
  }

  // Detect mermaid mindmap
  if (type === 'mindmap' || /^mindmap\b/i.test(content)) {
    return <NativeMindmap source={content} title={diagram.title} />
  }

  // ASCII / text diagram — styled <pre>
  return (
    <div className="native-diagram">
      <div className="native-diagram__title">{diagram.title}</div>
      <pre className="native-diagram__pre">{content}</pre>
    </div>
  )
}
