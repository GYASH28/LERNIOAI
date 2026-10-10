'use client'

import { useState, useMemo, useEffect } from 'react'
import {
  FileText,
  Download,
  Search,
  BookOpen,
  ChevronRight,
  ArrowLeft,
  Award,
  Layers,
  Sparkles,
} from 'lucide-react'
import Link from 'next/link'

export interface MaterialLessonLink {
  slug: string
  title: string
  unitNumber: number
  unitTitle: string
}

export interface MaterialSubject {
  code: string
  name: string
  semester: number
  credits: number
  category: string
  url: string | null
  lessons: MaterialLessonLink[]
}

export function MaterialsList({ pdfs }: { pdfs: MaterialSubject[] }) {
  const [search, setSearch] = useState('')
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)
  const [resourceFilter, setResourceFilter] = useState<'all' | 'notes' | 'pdf'>('all')

  useEffect(() => {
    const sync = () => {
      const code = new URLSearchParams(window.location.search).get('subject')
      setSelectedSubject(code && pdfs.some(p => p.code === code) ? code : null)
    }
    sync()
    window.addEventListener('popstate', sync)
    return () => window.removeEventListener('popstate', sync)
  }, [pdfs])

  function selectSubject(code: string | null) {
    setSelectedSubject(code)
    const url = new URL(window.location.href)
    if (code) url.searchParams.set('subject', code)
    else url.searchParams.delete('subject')
    window.history.pushState(null, '', url.pathname + url.search + url.hash)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const filtered = useMemo(() => {
    let result = pdfs
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    }
    if (semesterFilter !== null) {
      result = result.filter(p => p.semester === semesterFilter)
    }
    if (resourceFilter === 'notes') result = result.filter(p => p.lessons.length > 0)
    if (resourceFilter === 'pdf') result = result.filter(p => Boolean(p.url))
    return result
  }, [pdfs, search, semesterFilter, resourceFilter])

  const bySemester = useMemo(() => {
    const groups: Record<number, MaterialSubject[]> = {}
    filtered.forEach(p => {
      if (!groups[p.semester]) groups[p.semester] = []
      groups[p.semester].push(p)
    })
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b))
  }, [filtered])

  // ─── Subject detail view ──────────────────────────────────────────────────
  if (selectedSubject) {
    const subject = pdfs.find(p => p.code === selectedSubject)
    if (!subject) {
      return (
        <div className="space-y-4">
          <button
            onClick={() => selectSubject(null)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all subjects
          </button>
          <p className="text-sm text-muted-foreground">Subject not found.</p>
        </div>
      )
    }

    const lessonCount = subject.lessons.length
    const hasDetailedNotes = lessonCount > 0
    const byUnit = subject.lessons.reduce<Record<number, { title: string; lessons: MaterialLessonLink[] }>>(
      (groups, entry) => {
        if (!groups[entry.unitNumber]) groups[entry.unitNumber] = { title: entry.unitTitle, lessons: [] }
        groups[entry.unitNumber].lessons.push(entry)
        return groups
      }, {},
    )

    return (
      <div className="materials-detail">
        {/* Back link */}
        <button
          onClick={() => selectSubject(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all subjects
        </button>

        {/* Hero header */}
        <div className="materials-detail__hero">
          <div className="materials-detail__hero-content">
            <div className="materials-detail__icon">
              <BookOpen className="h-6 w-6" />
            </div>
            <div className="min-w-0">
              <h2 className="materials-detail__title">{subject.name}</h2>
              <div className="materials-detail__meta">
                <span className="materials-detail__meta-item">
                  <FileText className="h-3 w-3" />
                  {subject.code}
                </span>
                <span className="materials-detail__meta-item">
                  <Layers className="h-3 w-3" />
                  Semester {subject.semester}
                </span>
                <span className="materials-detail__meta-item">
                  <Award className="h-3 w-3" />
                  {subject.credits} credits
                </span>
                <span className="materials-detail__meta-item">
                  <BookOpen className="h-3 w-3" />
                  {lessonCount} lessons
                </span>
                {hasDetailedNotes && (
                  <span className="materials-detail__meta-item" style={{ background: 'color-mix(in oklch, #10b981 15%, transparent)', color: '#059669', border: 'none' }}>
                    <Sparkles className="h-3 w-3" />
                    Interactive lessons
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Detailed lesson notes — only render routes that actually exist. */}
        <div className="materials-section">
          <div className="materials-section__header">
            <div className="materials-section__icon">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="materials-section__title">
              {hasDetailedNotes ? 'Lessons by unit' : 'Study Resource'}
            </h3>
          </div>
          <div className="materials-section__body">
            {hasDetailedNotes ? (
              Object.entries(byUnit).map(([number, group]) => (
                <section key={number} className="space-y-2 rounded-xl border border-border/75 bg-card p-3 sm:p-4">
                  <div className="flex items-start gap-3 px-2 pb-2">
                    <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-sm font-bold text-primary">{number}</span>
                    <div>
                      <h4 className="font-semibold leading-6">{group.title}</h4>
                      <p className="text-xs text-muted-foreground">{group.lessons.length} lessons · Notes, revision and videos</p>
                    </div>
                  </div>
                  {group.lessons.map((lesson, index) => (
                    <Link key={lesson.slug}
                      href={`/materials/lesson/${subject.code}/${lesson.slug}`}
                      className="materials-lesson rounded-lg border border-transparent transition hover:border-primary/20 hover:bg-primary/5">
                      <span className="materials-lesson__number">{index + 1}</span>
                      <div className="materials-lesson__info">
                        <p className="materials-lesson__title">{lesson.title}</p>
                        <p className="materials-lesson__hint">Read · Slides · Revision · Video discovery</p>
                      </div>
                      <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
                    </Link>
                  ))}
                </section>
              ))
            ) : (
              <div className="rounded-xl border border-dashed border-border bg-muted/30 p-5">
                <p className="text-sm font-semibold text-foreground">PDF study guide available</p>
                <p className="mt-1 text-sm leading-6 text-muted-foreground">
                  This resource does not have a structured interactive lesson deck yet, so Lernio
                  will not send you to a broken lesson route. Use the verified PDF below.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Download PDF when a real PDF exists. */}
          {subject.url ? (
            <a href={subject.url} className="materials-download" download>
              <div className="materials-download__icon">
                <FileText className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="materials-download__title">Complete Study Notes (PDF)</p>
                <p className="materials-download__hint">Download the subject study guide</p>
              </div>
              <Download className="h-4 w-4 text-muted-foreground shrink-0" />
            </a>
          ) : (
            <div className="materials-download" aria-label="Interactive notes available">
              <div className="materials-download__icon">
                <BookOpen className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="materials-download__title">Interactive notes available</p>
                <p className="materials-download__hint">Use the detailed lessons above</p>
              </div>
              <Sparkles className="h-4 w-4 text-primary shrink-0" />
            </div>
          )}

          {/* Practice Quiz */}
          <Link
            href={`/exams`}
            className="materials-download"
            style={{ background: 'linear-gradient(135deg, color-mix(in oklch, #10b981 5%, var(--surface-1)), var(--surface-1))' }}
          >
            <div className="materials-download__icon" style={{ background: 'color-mix(in oklch, #10b981 12%, transparent)', color: '#059669' }}>
              <Award className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="materials-download__title">Open Practice & Exams</p>
              <p className="materials-download__hint">Use Lernio's question bank and mock-exam tools</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
          </Link>
        </div>

        {/* Subject page link removed — Materials is now independent from Learn */}
      </div>
    )
  }

  // ─── Subject list view ────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects by name or code..."
            className="w-full rounded-lg border border-border bg-card py-2.5 pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-colors"
          />
        </div>
        <select
          value={semesterFilter ?? ''}
          onChange={(e) => setSemesterFilter(e.target.value ? Number(e.target.value) : null)}
          className="rounded-lg border border-border bg-card px-3 py-2.5 text-sm focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none"
        >
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Semester {s}</option>)}
        </select>
      </div>

      <div className="flex flex-wrap gap-2" role="group" aria-label="Resource type">
        {([
          ['all', 'All resources'],
          ['notes', 'Interactive lessons'],
          ['pdf', 'PDF guides'],
        ] as const).map(([value, label]) => (
          <button key={value} type="button" aria-pressed={resourceFilter === value}
            onClick={() => setResourceFilter(value)}
            className={`min-h-10 rounded-full border px-4 text-xs font-semibold transition-colors ${
              resourceFilter === value
                ? 'border-primary bg-primary text-primary-foreground'
                : 'border-border bg-card hover:border-primary/40 hover:bg-muted'
            }`}>
            {label}
          </button>
        ))}
      </div>

      {/* Result count */}
      <p aria-live="polite" className="text-xs text-muted-foreground">
        Showing <span className="font-semibold text-foreground">{filtered.length}</span> of {pdfs.length} subjects
      </p>

      {/* Subject cards grouped by semester */}
      {bySemester.length === 0 ? (
        <div className="notes-empty">
          <div className="notes-empty__icon">
            <BookOpen className="h-7 w-7" />
          </div>
          <p className="notes-empty__title">No subjects found</p>
          <p className="notes-empty__desc">Try a different search or filter.</p>
        </div>
      ) : (
        bySemester.map(([sem, subjects]) => (
          <div key={sem}>
            <div className="mb-2 flex items-center gap-2">
              <span className="flex h-6 w-6 items-center justify-center rounded-md bg-primary/10 text-xs font-bold text-primary">
                {sem}
              </span>
              <h3 className="text-xs font-bold uppercase tracking-wide text-muted-foreground">
                Semester {sem}
              </h3>
              <span className="text-xs text-muted-foreground">· {subjects.length} subjects</span>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              {subjects.map((pdf) => (
                <button
                  key={pdf.code}
                  onClick={() => selectSubject(pdf.code)}
                  className="subject-card min-h-[110px] rounded-2xl border border-border/80 bg-card p-4 text-left transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-md sm:p-5"
                  type="button"
                >
                  <div className="subject-card__icon">
                    <BookOpen className="h-5 w-5" />
                  </div>
                  <div className="subject-card__info">
                    <p className="subject-card__name">{pdf.name}</p>
                    <div className="subject-card__meta">
                      <span>{pdf.code}</span>
                      <span>·</span>
                      <span>{pdf.credits} credits</span>
                      {pdf.lessons.length > 0 && (
                        <span className="subject-card__badge">{pdf.lessons.length} lessons</span>
                      )}
                    </div>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          </div>
        ))
      )}
    </div>
  )
}
