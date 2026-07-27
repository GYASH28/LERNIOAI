'use client'

import { useState, useMemo } from 'react'
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

interface PdfResource {
  code: string
  name: string
  semester: number
  credits: number
  category: string
  url: string
  hasDetailedNotes: boolean
}

export function MaterialsList({ pdfs }: { pdfs: PdfResource[] }) {
  const [search, setSearch] = useState('')
  const [semesterFilter, setSemesterFilter] = useState<number | null>(null)
  const [selectedSubject, setSelectedSubject] = useState<string | null>(null)

  const filtered = useMemo(() => {
    let result = pdfs
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(p => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
    }
    if (semesterFilter !== null) {
      result = result.filter(p => p.semester === semesterFilter)
    }
    return result
  }, [pdfs, search, semesterFilter])

  const bySemester = useMemo(() => {
    const groups: Record<number, PdfResource[]> = {}
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
            onClick={() => setSelectedSubject(null)}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Back to all subjects
          </button>
          <p className="text-sm text-muted-foreground">Subject not found.</p>
        </div>
      )
    }

    const topics = generateTopics(subject.name, subject.code)
    const lessonCount = topics.length

    return (
      <div className="materials-detail">
        {/* Back link */}
        <button
          onClick={() => setSelectedSubject(null)}
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
                {subject.hasDetailedNotes && (
                  <span className="materials-detail__meta-item" style={{ background: 'color-mix(in oklch, #10b981 15%, transparent)', color: '#059669', border: 'none' }}>
                    <Sparkles className="h-3 w-3" />
                    Detailed notes
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Lessons & Topics — each is a clickable link */}
        <div className="materials-section">
          <div className="materials-section__header">
            <div className="materials-section__icon">
              <BookOpen className="h-4 w-4" />
            </div>
            <h3 className="materials-section__title">Lessons &amp; Topics — Click to Open Interactive Notes</h3>
          </div>
          <div className="materials-section__body">
            {topics.map((topic, i) => {
              const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
              const lessonHref = `/materials/lesson/${subject.code}/${slug}`
              return (
                <Link
                  key={i}
                  href={lessonHref}
                  className="materials-lesson"
                >
                  <span className="materials-lesson__number">{i + 1}</span>
                  <div className="materials-lesson__info">
                    <p className="materials-lesson__title">{topic}</p>
                    <p className="materials-lesson__hint">
                      Lesson {i + 1} · Click to open the interactive textbook page
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Quick actions grid */}
        <div className="grid gap-3 sm:grid-cols-2">
          {/* Download PDF */}
          <a href={subject.url} className="materials-download">
            <div className="materials-download__icon">
              <FileText className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="materials-download__title">Complete Study Notes (PDF)</p>
              <p className="materials-download__hint">All topics in one document · Download</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground shrink-0" />
          </a>

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
              <p className="materials-download__title">Take Practice Quiz</p>
              <p className="materials-download__hint">AI-generated questions for this subject</p>
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

      {/* Result count */}
      <p className="text-xs text-muted-foreground">
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
            <div className="grid gap-2 sm:grid-cols-2">
              {subjects.map((pdf) => (
                <button
                  key={pdf.code}
                  onClick={() => setSelectedSubject(pdf.code)}
                  className="subject-card"
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
                      {pdf.hasDetailedNotes && (
                        <span className="subject-card__badge">Detailed</span>
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

/**
 * Generate topic list from subject name.
 * Each subject gets a lesson-level structure for the materials page.
 */
function generateTopics(subjectName: string, _subjectCode: string): string[] {
  const TOPIC_MAP: Record<string, string[]> = {
    'Data Structures': [
      'Introduction to Data Structures',
      'Arrays and Dynamic Arrays',
      'Linked Lists (Singly, Doubly, Circular)',
      'Stacks and Applications',
      'Queues and Priority Queues',
      'Trees — Binary Trees',
      'Binary Search Trees (BST)',
      'AVL Trees and Rotations',
      'Heaps and Heap Sort',
      'Hash Tables and Collision Resolution',
      'Graphs — Representation',
      'Depth-First Search (DFS)',
      'Breadth-First Search (BFS)',
      'Sorting Algorithms',
      'Searching Algorithms',
      'Dynamic Programming Basics',
      'Time and Space Complexity Analysis',
    ],
    'Object Oriented Programming with C++': [
      'Introduction to OOP Concepts',
      'C++ Basics and Syntax',
      'Classes and Objects',
      'Constructors and Destructors',
      'Encapsulation and Access Specifiers',
      'Inheritance — Single, Multiple, Multilevel',
      'Polymorphism — Function Overloading',
      'Operator Overloading',
      'Virtual Functions and Runtime Polymorphism',
      'Templates — Function and Class Templates',
      'Exception Handling',
      'STL — Containers, Iterators, Algorithms',
      'File Handling in C++',
      'Memory Management — new and delete',
      'Namespaces and Scope Resolution',
    ],
    'Programming in C': [
      'Introduction to C Programming',
      'Data Types, Variables, and Constants',
      'Operators and Expressions',
      'Input and Output Functions',
      'Control Structures — if, switch, loops',
      'Arrays — One and Two Dimensional',
      'Strings and String Functions',
      'Functions and Recursion',
      'Pointers — Basics and Arithmetic',
      'Pointers and Arrays',
      'Dynamic Memory Allocation',
      'Structures and Unions',
      'File Handling in C',
      'Preprocessor Directives',
      'Command Line Arguments',
    ],
    'Database Management System': [
      'Introduction to DBMS',
      'Database Models and Architecture',
      'Entity-Relationship Model',
      'Relational Model and Constraints',
      'Normalization — 1NF, 2NF, 3NF, BCNF',
      'SQL — DDL, DML, DCL Commands',
      'SQL Queries and Joins',
      'Transactions and ACID Properties',
      'Concurrency Control and Locking',
      'Indexing and Hashing',
      'Database Security',
      'NoSQL Databases Overview',
    ],
    'Operating System': [
      'Introduction to Operating Systems',
      'Process Management and Scheduling',
      'Threads and Multithreading',
      'CPU Scheduling Algorithms',
      'Process Synchronization',
      'Inter-Process Communication (IPC)',
      'Deadlocks — Prevention and Avoidance',
      'Memory Management',
      'Paging and Segmentation',
      'Virtual Memory and Page Replacement',
      'File System Management',
      'Disk Scheduling Algorithms',
      'Linux Commands and Shell Scripting',
    ],
    'Computer Networks': [
      'Introduction to Computer Networks',
      'OSI Model — 7 Layers',
      'TCP/IP Model',
      'Physical Layer — Transmission Media',
      'Data Link Layer — Framing, Error Detection',
      'MAC Layer — Multiple Access Protocols',
      'Network Layer — IP Addressing, Subnetting',
      'Routing Algorithms',
      'Transport Layer — TCP and UDP',
      'Session and Presentation Layers',
      'Application Layer — HTTP, DNS, SMTP, FTP',
      'Network Security — Firewalls, VPN',
    ],
  }

  if (TOPIC_MAP[subjectName]) return TOPIC_MAP[subjectName]

  // Generic topics for unknown subjects
  return [
    'Introduction and Overview',
    'Fundamental Concepts',
    'Key Terminology',
    'Core Principles',
    'Practical Applications',
    'Common Algorithms/Methods',
    'Advanced Topics',
    'Problem-Solving Techniques',
    'Exam Important Points',
    'Summary and Key Takeaways',
  ]
}
