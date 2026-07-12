'use client'

import { useState, useMemo } from 'react'
import { FileText, Download, Search, BookOpen, ChevronRight, ArrowLeft } from 'lucide-react'
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

  // Group by semester
  const bySemester = useMemo(() => {
    const groups: Record<number, PdfResource[]> = {}
    filtered.forEach(p => {
      if (!groups[p.semester]) groups[p.semester] = []
      groups[p.semester].push(p)
    })
    return Object.entries(groups).sort(([a], [b]) => Number(a) - Number(b))
  }, [filtered])

  // If a subject is selected, show its detail page
  if (selectedSubject) {
    const subject = pdfs.find(p => p.code === selectedSubject)
    if (!subject) {
      setSelectedSubject(null)
      return null
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setSelectedSubject(null)}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to all subjects
        </button>

        <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              <BookOpen className="h-6 w-6 text-primary" />
            </div>
            <div>
              <h2 className="text-lg font-bold">{subject.name}</h2>
              <p className="text-xs text-muted-foreground">
                {subject.code} · Semester {subject.semester} · {subject.credits} credits
              </p>
            </div>
          </div>
        </div>

        {/* Topics / Lessons list — each lesson is a clickable link */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Lessons & Topics</h3>
          <div className="space-y-2">
            {generateTopics(subject.name, subject.code).map((topic, i) => {
              const slug = topic.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)
              const lessonHref = `/learn/DCOMP/semester/${subject.semester}/subject/${subject.code}/lesson/${slug}`
              return (
                <Link
                  key={i}
                  href={lessonHref}
                  className="quest-card flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/40 hover:bg-accent/5 transition-colors"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{topic}</p>
                    <p className="text-[10px] text-muted-foreground">Lesson {i + 1} · Click to open interactive notes</p>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </Link>
              )
            })}
          </div>
        </div>

        {/* Download PDF */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Download</h3>
          <a
            href={subject.url}
            className="quest-card flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-red-500/10">
              <FileText className="h-5 w-5 text-red-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Complete Study Notes (PDF)</p>
              <p className="text-[10px] text-muted-foreground">All topics in one document</p>
            </div>
            <Download className="h-4 w-4 text-muted-foreground" />
          </a>
        </div>

        {/* Interactive quiz link */}
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">Practice</h3>
          <Link
            href={`/exams`}
            className="quest-card flex items-center gap-3 rounded-lg border border-border bg-background p-3 hover:border-primary/40"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10">
              <BookOpen className="h-5 w-5 text-emerald-600" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">Take Practice Quiz</p>
              <p className="text-[10px] text-muted-foreground">AI-generated questions for this subject</p>
            </div>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          </Link>
        </div>
      </div>
    )
  }

  // Subject list view
  return (
    <div className="space-y-4">
      {/* Search + filter */}
      <div className="flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects..."
            className="w-full rounded-md border border-border bg-background py-2 pl-8 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
        <select
          value={semesterFilter ?? ''}
          onChange={(e) => setSemesterFilter(e.target.value ? Number(e.target.value) : null)}
          className="rounded-md border border-border bg-background px-2 py-2 text-xs"
        >
          <option value="">All semesters</option>
          {[1, 2, 3, 4, 5, 6].map(s => <option key={s} value={s}>Sem {s}</option>)}
        </select>
      </div>

      {/* Subject cards grouped by semester */}
      {bySemester.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <div className="mb-3 text-4xl">📚</div>
          <p className="text-sm font-medium">No subjects found</p>
          <p className="text-xs text-muted-foreground">Try a different search or filter.</p>
        </div>
      ) : (
        bySemester.map(([sem, subjects]) => (
          <div key={sem}>
            <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">
              Semester {sem}
            </h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {subjects.map((pdf) => (
                <button
                  key={pdf.code}
                  onClick={() => setSelectedSubject(pdf.code)}
                  className="quest-card flex items-center gap-3 rounded-xl border border-border bg-card p-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 subject-badge">
                    <BookOpen className="h-5 w-5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold">{pdf.name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {pdf.code} · 💎 {pdf.credits} credits
                      {pdf.hasDetailedNotes && ' · ✨ Detailed notes'}
                    </p>
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
 * This gives each subject a lesson-level structure for the materials page.
 */
function generateTopics(subjectName: string, subjectCode: string): string[] {
  // Pre-defined topic lists for known subjects
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

  // Check if we have predefined topics
  if (TOPIC_MAP[subjectName]) {
    return TOPIC_MAP[subjectName]
  }

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
