'use client'

import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'
import { BookMarked, Copy, RotateCcw, X } from 'lucide-react'
import { toast } from 'sonner'
import { STUDENT_OS_STORAGE } from '@/lib/student-os/catalog'

interface SelectionState {
  text: string
  x: number
  y: number
}

interface CompatibleNotebookEntry {
  id: string
  type: 'note' | 'flashcard'
  title: string
  body: string
  answer?: string
  tags: string[]
  sourceHref?: string
  pinned: boolean
  createdAt: string
  updatedAt: string
}

const PUBLIC_PREFIXES = ['/sign-in', '/sign-up', '/forgot-password', '/reset-password', '/verify-email', '/privacy', '/terms']

function isPublicRoute(pathname: string) {
  return pathname === '/' || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix))
}

function createId() {
  if (typeof crypto !== 'undefined' && 'randomUUID' in crypto) return crypto.randomUUID()
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

function safeNotebookEntries() {
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STUDENT_OS_STORAGE.notebook) || '[]') as unknown
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function inferTitle(text: string) {
  const compact = text.replace(/\s+/g, ' ').trim()
  return compact.length > 58 ? `${compact.slice(0, 58)}…` : compact
}

export function SelectionLearningTools() {
  const pathname = usePathname() || '/'
  const [selection, setSelection] = useState<SelectionState | null>(null)

  useEffect(() => {
    const capture = () => {
      const activeElement = document.activeElement
      if (
        activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement ||
        activeElement?.getAttribute('contenteditable') === 'true'
      ) {
        setSelection(null)
        return
      }

      const selected = window.getSelection()
      const text = selected?.toString().replace(/\s+/g, ' ').trim() || ''
      if (!selected || selected.rangeCount === 0 || text.length < 4 || text.length > 1200) {
        setSelection(null)
        return
      }

      const range = selected.getRangeAt(0)
      const commonElement = range.commonAncestorContainer instanceof Element
        ? range.commonAncestorContainer
        : range.commonAncestorContainer.parentElement
      if (commonElement?.closest('[data-disable-learning-selection], input, textarea, [contenteditable="true"]')) {
        setSelection(null)
        return
      }

      const rect = range.getBoundingClientRect()
      setSelection({
        text,
        x: Math.min(window.innerWidth - 16, Math.max(16, rect.left + rect.width / 2)),
        y: Math.max(76, rect.top - 12),
      })
    }

    const clearOnScroll = () => setSelection(null)
    document.addEventListener('pointerup', capture)
    document.addEventListener('keyup', capture)
    window.addEventListener('scroll', clearOnScroll, true)
    return () => {
      document.removeEventListener('pointerup', capture)
      document.removeEventListener('keyup', capture)
      window.removeEventListener('scroll', clearOnScroll, true)
    }
  }, [])

  if (isPublicRoute(pathname) || !selection) return null

  const save = (type: CompatibleNotebookEntry['type']) => {
    const now = new Date().toISOString()
    const entry: CompatibleNotebookEntry = {
      id: createId(),
      type,
      title: type === 'flashcard' ? `Recall: ${inferTitle(selection.text)}` : inferTitle(selection.text),
      body: type === 'flashcard' ? 'Explain this selected concept in your own words.' : selection.text,
      answer: type === 'flashcard' ? selection.text : undefined,
      tags: type === 'flashcard' ? ['selection', 'flashcard'] : ['selection'],
      sourceHref: pathname,
      pinned: false,
      createdAt: now,
      updatedAt: now,
    }

    try {
      window.localStorage.setItem(STUDENT_OS_STORAGE.notebook, JSON.stringify([entry, ...safeNotebookEntries()]))
      window.dispatchEvent(new CustomEvent('lernio:notebook-updated'))
      setSelection(null)
      window.getSelection()?.removeAllRanges()
      toast.success(type === 'flashcard' ? 'Created a flashcard from the selected text.' : 'Saved selected text to your notebook.')
    } catch {
      toast.error('Could not save the selected text on this device.')
    }
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(selection.text)
      toast.success('Selected text copied.')
      setSelection(null)
    } catch {
      toast.error('Could not copy the selected text.')
    }
  }

  return (
    <div
      className="fixed z-[70] -translate-x-1/2 -translate-y-full rounded-2xl border border-border bg-background/95 p-1.5 shadow-2xl backdrop-blur"
      style={{ left: selection.x, top: selection.y }}
      data-disable-learning-selection
      role="toolbar"
      aria-label="Selected text learning actions"
    >
      <div className="flex items-center gap-1">
        <button type="button" onClick={() => save('note')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-accent">
          <BookMarked className="h-4 w-4 text-primary" /> Save note
        </button>
        <button type="button" onClick={() => save('flashcard')} className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-semibold hover:bg-accent">
          <RotateCcw className="h-4 w-4 text-primary" /> Flashcard
        </button>
        <button type="button" onClick={() => void copy()} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="Copy selected text">
          <Copy className="h-4 w-4" />
        </button>
        <button type="button" onClick={() => setSelection(null)} className="flex h-8 w-8 items-center justify-center rounded-lg hover:bg-accent" aria-label="Close selected text tools">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  )
}
