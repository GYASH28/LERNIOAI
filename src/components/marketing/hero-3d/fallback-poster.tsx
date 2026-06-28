import type { CSSProperties } from 'react'
import {
  BookOpen,
  Brain,
  Code2,
  FileText,
  GraduationCap,
  Sparkles,
} from 'lucide-react'

const ORBIT_MODULES = [
  { label: 'Learn', icon: BookOpen },
  { label: 'Practice', icon: Brain },
  { label: 'Exams', icon: GraduationCap },
  { label: 'Notes', icon: FileText },
  { label: 'Practicals', icon: Code2 },
  { label: 'LEO AI', icon: Sparkles },
] as const

const MINI_BOOKS = ['Subjects', 'Semesters', 'Revision', 'Projects'] as const

export function KnowledgeCorePoster() {
  return (
    <div
      className="knowledge-core-shell knowledge-book-shell"
      role="img"
      aria-label="A living digital knowledge book connecting Lernio learning, practice, exams, notes, practicals and LEO AI."
    >
      <div className="knowledge-core-scene knowledge-book-scene">
        <div className="knowledge-book-grid" aria-hidden="true" />
        <div className="knowledge-book-halo knowledge-book-halo--one" aria-hidden="true" />
        <div className="knowledge-book-halo knowledge-book-halo--two" aria-hidden="true" />

        <div className="knowledge-book-stage" data-hero-book aria-hidden="true">
          <div className="knowledge-book-shadow" />

          <div className="knowledge-book">
            <span className="knowledge-book__cover knowledge-book__cover--left" />
            <span className="knowledge-book__cover knowledge-book__cover--right" />

            <span className="knowledge-book__pages knowledge-book__pages--left">
              <i />
              <i />
              <i />
            </span>
            <span className="knowledge-book__pages knowledge-book__pages--right">
              <i />
              <i />
              <i />
            </span>

            <span className="knowledge-book__spine" />
            <span className="knowledge-book__bookmark" />
          </div>

          <div className="knowledge-book-core">
            <span className="knowledge-book-core__ring knowledge-book-core__ring--one" />
            <span className="knowledge-book-core__ring knowledge-book-core__ring--two" />
            <span className="knowledge-book-core__ring knowledge-book-core__ring--three" />
            <span className="knowledge-book-core__glass">
              <span className="knowledge-book-core__facet">
                <Sparkles className="h-6 w-6" />
              </span>
            </span>
          </div>

          <div className="knowledge-mini-books">
            {MINI_BOOKS.map((label, index) => (
              <span
                key={label}
                className="knowledge-mini-book"
                style={{ '--mini-index': index, animationDelay: `${index * -0.65}s` } as CSSProperties}
              >
                <i />
                <b>{label}</b>
              </span>
            ))}
          </div>
        </div>

        <div className="knowledge-book-orbit" aria-hidden="true">
          {ORBIT_MODULES.map(({ label, icon: Icon }, index) => (
            <span
              key={label}
              className="knowledge-book-module"
              style={{ '--orbit-index': index } as CSSProperties}
            >
              <Icon className="h-4 w-4" />
              <span>{label}</span>
            </span>
          ))}
        </div>

        <div className="knowledge-book-status" aria-hidden="true">
          <span><strong>6</strong> branches</span>
          <span><strong>36</strong> semesters</span>
          <span><strong>1</strong> learning OS</span>
        </div>
      </div>
    </div>
  )
}
