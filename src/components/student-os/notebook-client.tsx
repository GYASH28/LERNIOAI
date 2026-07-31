'use client'

import Link from 'next/link'
import { useMemo, useRef, useState } from 'react'
import {
  ArrowLeft,
  BookMarked,
  BrainCircuit,
  Check,
  Copy,
  Download,
  FileQuestion,
  Filter,
  Lightbulb,
  NotebookPen,
  Pin,
  PinOff,
  Plus,
  RotateCcw,
  Search,
  Sparkles,
  Tag,
  Trash2,
  X,
} from 'lucide-react'
import { toast } from 'sonner'
import { Mascot } from '@/components/mascots/mascot'
import { cn } from '@/lib/utils'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'
import { useLocalState } from '@/components/student-os/use-local-state'

type NotebookEntryType = 'note' | 'mistake' | 'formula' | 'question' | 'flashcard'

interface NotebookEntry {
  id: string
  type: NotebookEntryType
  title: string
  body: string
  answer?: string
  subject?: string
  lesson?: string
  tags: string[]
  sourceHref?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

const typeMeta: Record<NotebookEntryType, { label: string; icon: typeof NotebookPen; description: string }> = {
  note: { label: 'Note', icon: NotebookPen, description: 'A useful explanation or summary.' },
  mistake: { label: 'Mistake', icon: BrainCircuit, description: 'What went wrong and how to avoid it.' },
  formula: { label: 'Formula', icon: Lightbulb, description: 'A rule, formula or compact reference.' },
  question: { label: 'Question', icon: FileQuestion, description: 'Something to ask, investigate or practise.' },
  flashcard: { label: 'Flashcard', icon: RotateCcw, description: 'Front and back for active recall.' },
}

const starterEntries: NotebookEntry[] = [
  {
    id: 'starter-mistake',
    type: 'mistake',
    title: 'Example: binary place values',
    body: 'I read the digits left-to-right instead of matching them to powers of two.',
    answer: 'Write 16, 8, 4, 2, 1 above the bits first, then add only the active positions.',
    subject: 'Digital Fundamentals',
    lesson: 'Number Systems',
    tags: ['binary', 'mistake'],
    sourceHref: '/games',
    pinned: false,
    createdAt: new Date(0).toISOString(),
    updatedAt: new Date(0).toISOString(),
  },
]

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

export function NotebookClient() {
  const [entries, setEntries] = useLocalState<NotebookEntry[]>(STUDENT_OS_STORAGE.notebook, starterEntries)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState<'all' | NotebookEntryType>('all')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [composerOpen, setComposerOpen] = useState(false)
  const [reviewMode, setReviewMode] = useState(false)
  const [reviewIndex, setReviewIndex] = useState(0)
  const [showAnswer, setShowAnswer] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)

  const visibleEntries = useMemo(() => {
    const query = search.trim().toLowerCase()
    return [...entries]
      .filter((entry) => typeFilter === 'all' || entry.type === typeFilter)
      .filter((entry) => {
        if (!query) return true
        return [entry.title, entry.body, entry.answer, entry.subject, entry.lesson, entry.tags.join(' ')]
          .filter(Boolean)
          .join(' ')
          .toLowerCase()
          .includes(query)
      })
      .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt.localeCompare(a.updatedAt))
  }, [entries, search, typeFilter])

  const selectedEntry = entries.find((entry) => entry.id === selectedId) ?? null
  const flashcards = entries.filter((entry) => entry.type === 'flashcard')
  const reviewCard = flashcards[reviewIndex] ?? null

  const saveEntry = (draft: Omit<NotebookEntry, 'id' | 'createdAt' | 'updatedAt' | 'pinned'>) => {
    const now = new Date().toISOString()
    const entry: NotebookEntry = {
      ...draft,
      id: createId(),
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }
    setEntries((current) => [entry, ...current])
    setSelectedId(entry.id)
    setComposerOpen(false)
    toast.success('Saved to your Lernio notebook.')
  }

  const updateEntry = (entryId: string, changes: Partial<NotebookEntry>) => {
    setEntries((current) => current.map((entry) => (
      entry.id === entryId ? { ...entry, ...changes, updatedAt: new Date().toISOString() } : entry
    )))
  }

  const deleteEntry = (entryId: string) => {
    setEntries((current) => current.filter((entry) => entry.id !== entryId))
    if (selectedId === entryId) setSelectedId(null)
    toast.success('Notebook entry deleted.')
  }

  const convertToFlashcard = (entry: NotebookEntry) => {
    updateEntry(entry.id, {
      type: 'flashcard',
      answer: entry.answer || entry.body,
      body: entry.title,
    })
    toast.success('Converted into an active-recall flashcard.')
  }

  const exportNotebook = () => {
    const payload = JSON.stringify({ version: 1, exportedAt: new Date().toISOString(), entries }, null, 2)
    const blob = new Blob([payload], { type: 'application/json' })
    const href = URL.createObjectURL(blob)
    const anchor = document.createElement('a')
    anchor.href = href
    anchor.download = `lernio-notebook-${new Date().toISOString().slice(0, 10)}.json`
    anchor.click()
    URL.revokeObjectURL(href)
    toast.success('Notebook exported as JSON.')
  }

  const importNotebook = async (file: File | undefined) => {
    if (!file) return
    try {
      const parsed = JSON.parse(await file.text()) as { entries?: NotebookEntry[] } | NotebookEntry[]
      const imported = Array.isArray(parsed) ? parsed : parsed.entries
      if (!Array.isArray(imported)) throw new Error('Invalid notebook format')
      const safeEntries = imported.filter((entry) => entry && typeof entry.id === 'string' && typeof entry.title === 'string' && typeof entry.body === 'string')
      setEntries((current) => {
        const existing = new Set(current.map((entry) => entry.id))
        return [...safeEntries.filter((entry) => !existing.has(entry.id)), ...current]
      })
      toast.success(`${safeEntries.length} notebook entries imported.`)
    } catch {
      toast.error('Could not import that notebook file.')
    } finally {
      if (importInputRef.current) importInputRef.current.value = ''
    }
  }

  const startReview = () => {
    if (flashcards.length === 0) {
      toast.error('Create or convert at least one flashcard first.')
      return
    }
    setReviewIndex(0)
    setShowAnswer(false)
    setReviewMode(true)
  }

  const nextReviewCard = () => {
    setReviewIndex((current) => (current + 1) % flashcards.length)
    setShowAnswer(false)
  }

  return (
    <div className="space-y-6 pb-10">
      <section className="overflow-hidden rounded-3xl border border-primary/20 bg-gradient-to-br from-amber-500/10 via-primary/10 to-background p-5 sm:p-7">
        <div className="grid items-center gap-5 lg:grid-cols-[1fr_220px]">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-primary">
              <BookMarked className="h-4 w-4" /> Personal knowledge notebook
            </div>
            <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Keep the explanation you will need later.</h1>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground sm:text-base">
              Save notes, mistakes, formulas, questions and flashcards. Search everything and export your own copy at any time.
            </p>
            <div className="mt-5 flex flex-wrap gap-2">
              <button type="button" onClick={() => setComposerOpen(true)} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> New entry
              </button>
              <button type="button" onClick={startReview} className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold hover:bg-accent">
                <RotateCcw className="h-4 w-4" /> Review flashcards
              </button>
              <Link href="/student-os" className="inline-flex items-center gap-2 rounded-xl border border-border bg-background/70 px-4 py-2.5 text-sm font-semibold hover:bg-accent">
                <ArrowLeft className="h-4 w-4" /> Learning Universe
              </Link>
            </div>
          </div>
          <div className="mx-auto rounded-3xl border border-border bg-background/70 p-4 text-center">
            <Mascot mascot="leo" state={entries.length > 1 ? 'achievement' : 'greeting'} size={118} />
            <p className="mt-1 text-sm font-bold">{entries.length} saved entries</p>
            <p className="text-xs text-muted-foreground">{flashcards.length} ready for recall</p>
          </div>
        </div>
      </section>

      <section className="grid gap-5 lg:grid-cols-[320px_1fr]">
        <aside className="rounded-3xl border border-border bg-card p-4">
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search notes, tags, subjects…"
              className="w-full rounded-xl border border-border bg-background py-2.5 pl-9 pr-9 text-sm outline-none focus:border-primary"
            />
            {search && (
              <button type="button" onClick={() => setSearch('')} className="absolute right-2 top-2 flex h-7 w-7 items-center justify-center rounded-lg hover:bg-accent" aria-label="Clear search">
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          <div className="mt-3 flex items-center gap-2 overflow-x-auto pb-1">
            <Filter className="h-4 w-4 shrink-0 text-muted-foreground" />
            {(['all', 'note', 'mistake', 'formula', 'question', 'flashcard'] as const).map((type) => (
              <button
                key={type}
                type="button"
                onClick={() => setTypeFilter(type)}
                className={cn(
                  'shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold capitalize',
                  typeFilter === type ? 'border-primary bg-primary/10 text-primary' : 'border-border hover:bg-accent',
                )}
              >
                {type === 'all' ? 'All' : typeMeta[type].label}
              </button>
            ))}
          </div>

          <div className="mt-4 max-h-[620px] space-y-2 overflow-y-auto pr-1">
            {visibleEntries.map((entry) => {
              const Icon = typeMeta[entry.type].icon
              return (
                <button
                  key={entry.id}
                  type="button"
                  onClick={() => setSelectedId(entry.id)}
                  className={cn(
                    'w-full rounded-2xl border p-3 text-left transition-colors',
                    selectedId === entry.id ? 'border-primary bg-primary/10' : 'border-border bg-background hover:bg-accent/50',
                  )}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1">
                        <p className="truncate text-sm font-semibold">{entry.title}</p>
                        {entry.pinned && <Pin className="h-3 w-3 shrink-0 text-primary" />}
                      </div>
                      <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{entry.body}</p>
                      <div className="mt-2 flex flex-wrap gap-1">
                        {entry.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">#{tag}</span>
                        ))}
                      </div>
                    </div>
                  </div>
                </button>
              )
            })}
            {visibleEntries.length === 0 && (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center">
                <NotebookPen className="mx-auto h-7 w-7 text-muted-foreground" />
                <p className="mt-2 text-sm font-semibold">No matching entries</p>
                <p className="mt-1 text-xs text-muted-foreground">Change the filter or create a new note.</p>
              </div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-2 border-t border-border pt-4">
            <button type="button" onClick={exportNotebook} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">
              <Download className="h-4 w-4" /> Export
            </button>
            <button type="button" onClick={() => importInputRef.current?.click()} className="inline-flex items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-xs font-semibold hover:bg-accent">
              <Sparkles className="h-4 w-4" /> Import
            </button>
            <input ref={importInputRef} type="file" accept="application/json" className="hidden" onChange={(event) => void importNotebook(event.target.files?.[0])} />
          </div>
        </aside>

        <div className="rounded-3xl border border-border bg-card p-5 sm:p-7">
          {selectedEntry ? (
            <EntryDetail
              entry={selectedEntry}
              onUpdate={(changes) => updateEntry(selectedEntry.id, changes)}
              onDelete={() => deleteEntry(selectedEntry.id)}
              onConvert={() => convertToFlashcard(selectedEntry)}
            />
          ) : (
            <div className="flex min-h-[520px] flex-col items-center justify-center text-center">
              <Mascot mascot="leo" state="idle" size={120} />
              <h2 className="mt-3 text-xl font-bold">Select an entry</h2>
              <p className="mt-1 max-w-md text-sm leading-6 text-muted-foreground">
                Open a saved item from the left, or create a note after learning, practising, watching a video or finding a mistake.
              </p>
              <button type="button" onClick={() => setComposerOpen(true)} className="mt-5 inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
                <Plus className="h-4 w-4" /> Create first useful note
              </button>
            </div>
          )}
        </div>
      </section>

      {composerOpen && <EntryComposer onClose={() => setComposerOpen(false)} onSave={saveEntry} />}

      {reviewMode && reviewCard && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Flashcard review">
          <div className="w-full max-w-2xl rounded-3xl border border-border bg-background p-5 shadow-2xl sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">Active recall</p>
                <p className="mt-1 text-sm text-muted-foreground">Card {reviewIndex + 1} of {flashcards.length}</p>
              </div>
              <button type="button" onClick={() => setReviewMode(false)} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Close review">
                <X className="h-4 w-4" />
              </button>
            </div>
            <button
              type="button"
              onClick={() => setShowAnswer((value) => !value)}
              className="mt-6 flex min-h-72 w-full flex-col items-center justify-center rounded-3xl border border-primary/20 bg-gradient-to-br from-primary/10 to-background p-8 text-center"
            >
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{showAnswer ? 'Answer' : 'Question'}</p>
              <p className="mt-4 text-2xl font-bold leading-9">{showAnswer ? (reviewCard.answer || reviewCard.body) : reviewCard.body}</p>
              <p className="mt-6 text-xs font-semibold text-primary">Tap to {showAnswer ? 'see the question' : 'reveal the answer'}</p>
            </button>
            <div className="mt-5 flex justify-between gap-2">
              <button type="button" onClick={() => setShowAnswer((value) => !value)} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">Flip card</button>
              <button type="button" onClick={nextReviewCard} className="rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground">Next card</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

function EntryComposer({
  onClose,
  onSave,
}: {
  onClose: () => void
  onSave: (entry: Omit<NotebookEntry, 'id' | 'createdAt' | 'updatedAt' | 'pinned'>) => void
}) {
  const [type, setType] = useState<NotebookEntryType>('note')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [answer, setAnswer] = useState('')
  const [subject, setSubject] = useState('')
  const [lesson, setLesson] = useState('')
  const [tags, setTags] = useState('')
  const [sourceHref, setSourceHref] = useState('')

  const submit = () => {
    if (!title.trim() || !body.trim()) {
      toast.error('Add a clear title and useful content first.')
      return
    }
    onSave({
      type,
      title: title.trim(),
      body: body.trim(),
      answer: answer.trim() || undefined,
      subject: subject.trim() || undefined,
      lesson: lesson.trim() || undefined,
      tags: tags.split(',').map((tag) => tag.trim().toLowerCase()).filter(Boolean).slice(0, 8),
      sourceHref: sourceHref.trim() || undefined,
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-0 backdrop-blur-sm sm:items-center sm:p-4" role="dialog" aria-modal="true" aria-label="Create notebook entry">
      <div className="max-h-[94dvh] w-full max-w-3xl overflow-y-auto rounded-t-3xl border border-border bg-background p-5 shadow-2xl sm:rounded-3xl sm:p-7">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">Quick capture</p>
            <h2 className="mt-1 text-2xl font-bold">Save something worth revisiting</h2>
          </div>
          <button type="button" onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Close composer">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-5">
          {(Object.keys(typeMeta) as NotebookEntryType[]).map((entryType) => {
            const meta = typeMeta[entryType]
            const Icon = meta.icon
            return (
              <button key={entryType} type="button" onClick={() => setType(entryType)} className={cn('rounded-xl border p-3 text-left', type === entryType ? 'border-primary bg-primary/10' : 'border-border hover:bg-accent')}>
                <Icon className="h-4 w-4 text-primary" />
                <p className="mt-2 text-sm font-semibold">{meta.label}</p>
              </button>
            )
          })}
        </div>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <Field label="Title" value={title} onChange={setTitle} placeholder="What should future-you recognise?" className="sm:col-span-2" />
          <TextField label={type === 'flashcard' ? 'Question / front' : 'Content'} value={body} onChange={setBody} placeholder={typeMeta[type].description} className="sm:col-span-2" />
          {(type === 'mistake' || type === 'question' || type === 'flashcard') && (
            <TextField label={type === 'flashcard' ? 'Answer / back' : 'Correction or answer'} value={answer} onChange={setAnswer} placeholder="Explain the correct reasoning." className="sm:col-span-2" />
          )}
          <Field label="Subject" value={subject} onChange={setSubject} placeholder="Data Structures" />
          <Field label="Lesson" value={lesson} onChange={setLesson} placeholder="Linked Lists" />
          <Field label="Tags" value={tags} onChange={setTags} placeholder="exam, pointer, mistake" />
          <Field label="Source route" value={sourceHref} onChange={setSourceHref} placeholder="/learn/... or /games" />
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button type="button" onClick={onClose} className="rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">Cancel</button>
          <button type="button" onClick={submit} className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground"><Check className="h-4 w-4" /> Save entry</button>
        </div>
      </div>
    </div>
  )
}

function EntryDetail({
  entry,
  onUpdate,
  onDelete,
  onConvert,
}: {
  entry: NotebookEntry
  onUpdate: (changes: Partial<NotebookEntry>) => void
  onDelete: () => void
  onConvert: () => void
}) {
  const Icon = typeMeta[entry.type].icon

  const copyEntry = async () => {
    await navigator.clipboard.writeText(`${entry.title}\n\n${entry.body}${entry.answer ? `\n\n${entry.answer}` : ''}`)
    toast.success('Copied notebook entry.')
  }

  return (
    <article>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-primary">{typeMeta[entry.type].label}</p>
            <h2 className="mt-1 text-2xl font-bold">{entry.title}</h2>
            {(entry.subject || entry.lesson) && <p className="mt-1 text-sm text-muted-foreground">{[entry.subject, entry.lesson].filter(Boolean).join(' · ')}</p>}
          </div>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => onUpdate({ pinned: !entry.pinned })} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label={entry.pinned ? 'Unpin entry' : 'Pin entry'}>
            {entry.pinned ? <PinOff className="h-4 w-4" /> : <Pin className="h-4 w-4" />}
          </button>
          <button type="button" onClick={() => void copyEntry()} className="flex h-9 w-9 items-center justify-center rounded-xl border border-border hover:bg-accent" aria-label="Copy entry"><Copy className="h-4 w-4" /></button>
          <button type="button" onClick={onDelete} className="flex h-9 w-9 items-center justify-center rounded-xl border border-rose-500/30 text-rose-500 hover:bg-rose-500/10" aria-label="Delete entry"><Trash2 className="h-4 w-4" /></button>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-border bg-background p-5 text-sm leading-7 whitespace-pre-wrap">{entry.body}</div>
      {entry.answer && (
        <div className="mt-4 rounded-2xl border border-emerald-500/20 bg-emerald-500/5 p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-emerald-600">Answer / correction</p>
          <p className="mt-2 whitespace-pre-wrap text-sm leading-7">{entry.answer}</p>
        </div>
      )}

      {entry.tags.length > 0 && (
        <div className="mt-5 flex flex-wrap items-center gap-2">
          <Tag className="h-4 w-4 text-muted-foreground" />
          {entry.tags.map((tag) => <span key={tag} className="rounded-full border border-border bg-muted/50 px-2.5 py-1 text-xs">#{tag}</span>)}
        </div>
      )}

      <div className="mt-6 flex flex-wrap gap-2 border-t border-border pt-5">
        {entry.type !== 'flashcard' && (
          <button type="button" onClick={onConvert} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground">
            <RotateCcw className="h-4 w-4" /> Convert to flashcard
          </button>
        )}
        {entry.sourceHref && (
          <Link href={entry.sourceHref} className="inline-flex items-center gap-2 rounded-xl border border-border px-4 py-2.5 text-sm font-semibold hover:bg-accent">
            Open source
          </Link>
        )}
        <span className="self-center text-xs text-muted-foreground">Updated {new Date(entry.updatedAt).toLocaleString('en-IN')}</span>
      </div>
    </article>
  )
}

function Field({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <input value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="w-full rounded-xl border border-border bg-card px-3 py-2.5 text-sm outline-none focus:border-primary" />
    </label>
  )
}

function TextField({ label, value, onChange, placeholder, className }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
  return (
    <label className={className}>
      <span className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</span>
      <textarea value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} rows={5} className="w-full resize-y rounded-xl border border-border bg-card px-3 py-2.5 text-sm leading-6 outline-none focus:border-primary" />
    </label>
  )
}
