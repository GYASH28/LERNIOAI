'use client'

import { useState, useMemo } from 'react'
import { FileText, Download, Search, BookOpen } from 'lucide-react'

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

  const filtered = useMemo(() => {
    return pdfs.filter((pdf) => {
      const matchesSearch = pdf.name.toLowerCase().includes(search.toLowerCase()) ||
                            pdf.code.toLowerCase().includes(search.toLowerCase())
      const matchesSemester = semesterFilter === null || pdf.semester === semesterFilter
      return matchesSearch && matchesSemester
    })
  }, [pdfs, search, semesterFilter])

  const grouped = useMemo(() => {
    const groups: Record<number, PdfResource[]> = {}
    for (const pdf of filtered) {
      if (!groups[pdf.semester]) groups[pdf.semester] = []
      groups[pdf.semester].push(pdf)
    }
    return groups
  }, [filtered])

  return (
    <div>
      {/* Search + filters */}
      <div className="mb-6 space-y-3">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2">
          <Search className="h-4 w-4 text-muted-foreground shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search subjects..."
            className="w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSemesterFilter(null)}
            className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
              semesterFilter === null
                ? 'border-primary bg-primary/10 text-primary'
                : 'border-border text-muted-foreground hover:bg-accent'
            }`}
          >
            All Semesters
          </button>
          {[1, 2, 3, 4, 5, 6].map((sem) => (
            <button
              key={sem}
              onClick={() => setSemesterFilter(sem)}
              className={`rounded-md border px-3 py-1.5 text-xs font-medium transition-colors ${
                semesterFilter === sem
                  ? 'border-primary bg-primary/10 text-primary'
                  : 'border-border text-muted-foreground hover:bg-accent'
              }`}
            >
              Sem {sem}
            </button>
          ))}
        </div>
      </div>

      {/* Results count */}
      <p className="mb-4 text-xs text-muted-foreground">
        {filtered.length} of {pdfs.length} subjects
      </p>

      {/* Grouped by semester */}
      <div className="space-y-8">
        {Object.entries(grouped)
          .sort(([a], [b]) => Number(a) - Number(b))
          .map(([sem, items]) => (
            <div key={sem}>
              <h2 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <BookOpen className="h-4 w-4 text-primary" />
                Semester {sem}
                <span className="text-xs text-muted-foreground">({items.length} subjects)</span>
              </h2>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((pdf) => (
                  <div key={pdf.code} className="flex flex-col gap-2">
                    {pdf.hasDetailedNotes ? (
                      <a
                        href={`/materials/lesson/${pdf.code}/${pdf.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)}`}
                        className="group flex-1 rounded-lg border border-primary/30 bg-gradient-to-br from-primary/5 to-transparent p-4 transition-all hover:border-primary/50 hover:shadow-md"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{pdf.code}</p>
                            <h3 className="mt-1 text-sm font-medium leading-tight">{pdf.name}</h3>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{pdf.credits} credits</span>
                              <span>·</span>
                              <span className="capitalize">{pdf.category}</span>
                            </div>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <BookOpen className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-semibold text-primary">
                          <BookOpen className="h-3 w-3" /> Open Interactive Presentation
                        </div>
                      </a>
                    ) : (
                      <a
                        href={pdf.url}
                        download
                        className="group flex-1 rounded-lg border border-border bg-card p-4 transition-colors hover:border-primary/40 hover:bg-accent/5"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">{pdf.code}</p>
                            <h3 className="mt-1 text-sm font-medium leading-tight">{pdf.name}</h3>
                            <div className="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
                              <span>{pdf.credits} credits</span>
                              <span>·</span>
                              <span className="capitalize">{pdf.category}</span>
                            </div>
                          </div>
                          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10 group-hover:bg-primary/20 transition-colors">
                            <FileText className="h-4 w-4 text-primary" />
                          </div>
                        </div>
                        <div className="mt-3 flex items-center gap-1.5 text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                          <Download className="h-3 w-3" /> Download PDF
                        </div>
                      </a>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
      </div>

      {filtered.length === 0 && (
        <div className="rounded-lg border border-dashed border-border py-16 text-center">
          <FileText className="mx-auto h-8 w-8 text-muted-foreground" />
          <p className="mt-2 text-sm text-muted-foreground">No materials found matching your search.</p>
        </div>
      )}
    </div>
  )
}
