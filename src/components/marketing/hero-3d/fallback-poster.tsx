import type { CSSProperties } from 'react'
import {
  BookOpen,
  Bot,
  Brain,
  Code2,
  FileText,
  GraduationCap,
} from 'lucide-react'

const ORBIT_MODULES = [
  { label: 'Learn', icon: BookOpen, color: '#06B6D4' },
  { label: 'Practice', icon: Brain, color: '#8B5CF6' },
  { label: 'Exams', icon: GraduationCap, color: '#F59E0B' },
  { label: 'Notes', icon: FileText, color: '#10B981' },
  { label: 'Practicals', icon: Code2, color: '#EC4899' },
  { label: 'LEO AI', icon: Bot, color: '#06B6D4' },
] as const

const MINI_BOOKS = [
  { label: 'Subjects', color: '#06B6D4' },
  { label: 'Semesters', color: '#8B5CF6' },
  { label: 'Revision', color: '#F59E0B' },
  { label: 'Projects', color: '#10B981' },
] as const

export function KnowledgeCorePoster() {
  return (
    <div
      className="knowledge-core-shell knowledge-book-shell"
      role="img"
      aria-label="A living digital knowledge book connecting Lernio learning, practice, exams, notes, practicals and LEO AI."
    >
      <div className="knowledge-core-scene knowledge-book-scene">
        {/* Background effects */}
        <div className="knowledge-book-grid" aria-hidden="true" />
        <div className="knowledge-book-halo knowledge-book-halo--one" aria-hidden="true" />
        <div className="knowledge-book-halo knowledge-book-halo--two" aria-hidden="true" />
        <div className="knowledge-book-halo knowledge-book-halo--three" aria-hidden="true" />

        {/* The 3D Book — realistic open book with perspective */}
        <div className="knowledge-book-stage" data-hero-book aria-hidden="true">
          <div className="knowledge-book-shadow" />

          {/* Book container with 3D perspective */}
          <div className="knowledge-book-3d">
            {/* Left page */}
            <div className="kb-page kb-page--left">
              <div className="kb-page-content">
                <div className="kb-page-title">DATA STRUCTURES</div>
                <div className="kb-page-lines">
                  <span /><span /><span /><span /><span /><span />
                </div>
                <div className="kb-page-heading">Unit 1: Arrays</div>
                <div className="kb-page-lines kb-page-lines--short">
                  <span /><span /><span /><span />
                </div>
              </div>
            </div>

            {/* Right page */}
            <div className="kb-page kb-page--right">
              <div className="kb-page-content">
                <div className="kb-page-title">ALGORITHMS</div>
                <div className="kb-page-lines">
                  <span /><span /><span /><span /><span />
                </div>
                <div className="kb-page-code">
                  <span className="kb-code-line">{'const stack = []'}</span>
                  <span className="kb-code-line">{'stack.push(42)'}</span>
                  <span className="kb-code-line">{'stack.pop()'}</span>
                </div>
              </div>
            </div>

            {/* Center spine */}
            <div className="kb-spine" />

            {/* Page edges (visible thickness) */}
            <div className="kb-page-edges kb-page-edges--left" />
            <div className="kb-page-edges kb-page-edges--right" />

            {/* Bookmark */}
            <div className="kb-bookmark" />
          </div>
        </div>

        {/* Orbiting modules — counter-rotated so text stays straight */}
        <div className="knowledge-book-orbit" aria-hidden="true">
          {ORBIT_MODULES.map(({ label, icon: Icon, color }, index) => (
            <span
              key={label}
              className="knowledge-book-orbit-item"
              style={{ '--orbit-index': index, '--orbit-color': color } as CSSProperties}
            >
              <span className="knowledge-book-orbit-counter">
                <Icon className="h-4 w-4" style={{ color }} />
                <span>{label}</span>
              </span>
            </span>
          ))}
        </div>

        {/* Floating mini books around the scene */}
        <div className="knowledge-mini-books" aria-hidden="true">
          {MINI_BOOKS.map((book, index) => (
            <span
              key={book.label}
              className="knowledge-mini-book"
              style={{
                '--mini-index': index,
                '--mini-color': book.color,
                animationDelay: `${index * -1.2}s`,
              } as CSSProperties}
            >
              <span className="knowledge-mini-book-spine" />
              <span className="knowledge-mini-book-cover">
                <b>{book.label}</b>
              </span>
            </span>
          ))}
        </div>

        {/* Status bar */}
        <div className="knowledge-book-status" aria-hidden="true">
          <span><strong>48</strong> Subjects</span>
          <span><strong>6</strong> Semesters</span>
          <span><strong>107</strong> Lectures</span>
        </div>
      </div>
    </div>
  )
}
