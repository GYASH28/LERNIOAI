import type { CSSProperties } from 'react'
import { BookOpen, Brain, GraduationCap, Sparkles } from 'lucide-react'

const RING_ITEMS = [
  { label: 'Learn', icon: BookOpen },
  { label: 'Practice', icon: Brain },
  { label: 'Exams', icon: GraduationCap },
] as const

export function KnowledgeCorePoster() {
  return (
    <div
      className="knowledge-core-shell"
      role="img"
      aria-label="Lernio knowledge core showing connected learning, practice and exam preparation modes."
    >
      <div className="knowledge-core-scene">
        <div className="knowledge-core-grid" aria-hidden="true" />
        <div className="knowledge-core-glow knowledge-core-glow--one" aria-hidden="true" />
        <div className="knowledge-core-glow knowledge-core-glow--two" aria-hidden="true" />

        <div className="knowledge-core-symbol" aria-hidden="true">
          <span className="knowledge-core-symbol__page knowledge-core-symbol__page--left" />
          <span className="knowledge-core-symbol__page knowledge-core-symbol__page--right" />
          <span className="knowledge-core-symbol__flame knowledge-core-symbol__flame--outer" />
          <span className="knowledge-core-symbol__flame knowledge-core-symbol__flame--inner" />
          <span className="knowledge-core-symbol__orb">
            <Sparkles className="h-6 w-6" aria-hidden="true" />
          </span>
        </div>

        <div className="knowledge-core-ring knowledge-core-ring--outer" aria-hidden="true" />
        <div className="knowledge-core-ring knowledge-core-ring--inner" aria-hidden="true" />

        <div className="knowledge-core-orbit" aria-hidden="true">
          {RING_ITEMS.map(({ label, icon: Icon }, index) => (
            <span
              key={label}
              className="knowledge-core-node"
              style={{ '--node-index': index } as CSSProperties}
            >
              <Icon className="h-4 w-4" aria-hidden="true" />
              <span>{label}</span>
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}
