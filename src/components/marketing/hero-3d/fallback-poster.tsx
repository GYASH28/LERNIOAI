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

/**
 * V7 Premium 3D Knowledge Book
 *
 * - Highly detailed open book with thick layered pages (visible page stack)
 * - Curved paper geometry (pages curve up toward the spine)
 * - Premium spine with subtle gradient
 * - Soft paper texture (via layered gradients)
 * - Ambient glow + soft reflections
 * - Realistic layered shadow
 * - Dynamic page-flip animation on load (3 pages flip sequentially)
 * - Glassmorphism orbiting cards with magnetic hover
 * - Parallax floating mini-books
 * - Breathing + parallax motion
 *
 * Preserves the existing concept (open book + orbiting educational cards).
 */
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
        {/* V7: ambient glow under the book */}
        <div className="kb-ambient-glow" aria-hidden="true" />

        {/* The 3D Book — V7 premium edition */}
        <div className="knowledge-book-stage" data-hero-book aria-hidden="true">
          <div className="knowledge-book-shadow" />
          <div className="knowledge-book-shadow knowledge-book-shadow--soft" />

          {/* Book container with 3D perspective */}
          <div className="knowledge-book-3d">
            {/* V7: Thick layered page stack (visible from the side) */}
            <div className="kb-page-stack" aria-hidden="true">
              <div className="kb-page-stack-layer kb-page-stack-layer--1" />
              <div className="kb-page-stack-layer kb-page-stack-layer--2" />
              <div className="kb-page-stack-layer kb-page-stack-layer--3" />
              <div className="kb-page-stack-layer kb-page-stack-layer--4" />
              <div className="kb-page-stack-layer kb-page-stack-layer--5" />
            </div>

            {/* V7: Page-flip animation layers (flip on load) */}
            <div className="kb-flip-pages" aria-hidden="true">
              <div className="kb-flip-page kb-flip-page--1">
                <div className="kb-flip-page-inner">
                  <div className="kb-flip-page-text">
                    <span className="kb-flip-line" />
                    <span className="kb-flip-line kb-flip-line--short" />
                    <span className="kb-flip-line" />
                  </div>
                </div>
              </div>
              <div className="kb-flip-page kb-flip-page--2">
                <div className="kb-flip-page-inner">
                  <div className="kb-flip-page-text">
                    <span className="kb-flip-line" />
                    <span className="kb-flip-line kb-flip-line--short" />
                  </div>
                </div>
              </div>
              <div className="kb-flip-page kb-flip-page--3">
                <div className="kb-flip-page-inner">
                  <div className="kb-flip-page-text">
                    <span className="kb-flip-line" />
                    <span className="kb-flip-line" />
                    <span className="kb-flip-line kb-flip-line--short" />
                  </div>
                </div>
              </div>
            </div>

            {/* Left page — curved paper geometry */}
            <div className="kb-page kb-page--left">
              <div className="kb-page-curve" aria-hidden="true" />
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

            {/* Right page — curved paper geometry */}
            <div className="kb-page kb-page--right">
              <div className="kb-page-curve" aria-hidden="true" />
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

            {/* V7: Premium spine with gradient */}
            <div className="kb-spine kb-spine--premium" />

            {/* Page edges (visible thickness) */}
            <div className="kb-page-edges kb-page-edges--left" />
            <div className="kb-page-edges kb-page-edges--right" />

            {/* V7: Soft reflection on pages */}
            <div className="kb-page-reflection kb-page-reflection--left" aria-hidden="true" />
            <div className="kb-page-reflection kb-page-reflection--right" aria-hidden="true" />

            {/* Bookmark */}
            <div className="kb-bookmark" />
          </div>
        </div>

        {/* V7: Orbiting modules — glassmorphism + magnetic hover */}
        <div className="knowledge-book-orbit" aria-hidden="true">
          {ORBIT_MODULES.map(({ label, icon: Icon, color }, index) => (
            <span
              key={label}
              className="knowledge-book-orbit-item"
              style={{ '--orbit-index': index, '--orbit-color': color } as CSSProperties}
            >
              <span className="knowledge-book-orbit-counter">
                <span className="knowledge-book-orbit-glow" style={{ '--orbit-color': color } as CSSProperties} />
                <Icon className="h-4 w-4" style={{ color }} />
                <span>{label}</span>
              </span>
            </span>
          ))}
        </div>

        {/* V7: Floating mini books — parallax + better depth */}
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

        {/* V7: Gentle particles */}
        <div className="kb-particles" aria-hidden="true">
          <span className="kb-particle kb-particle--1" />
          <span className="kb-particle kb-particle--2" />
          <span className="kb-particle kb-particle--3" />
          <span className="kb-particle kb-particle--4" />
          <span className="kb-particle kb-particle--5" />
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
