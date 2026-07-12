'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import {
  Brain,
  Sparkles,
  Languages,
  Baby,
  Code2,
  ListChecks,
  Layers,
  FileText,
  MessageSquare,
  X,
  Loader2,
  Send,
  Volume2,
} from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

type AiAction =
  | 'explain'
  | 'simplify'
  | 'hinglish'
  | 'marathi'
  | 'eli10'
  | 'eli5'
  | 'examples'
  | 'coding_exercise'
  | 'quiz'
  | 'flashcards'
  | 'summary'
  | 'ask'

interface AiButton {
  action: AiAction
  label: string
  icon: typeof Brain
  group: 'explain' | 'language' | 'practice' | 'ask'
}

const AI_BUTTONS: AiButton[] = [
  { action: 'explain', label: 'Explain', icon: Brain, group: 'explain' },
  { action: 'simplify', label: 'Simplify', icon: Sparkles, group: 'explain' },
  { action: 'summary', label: 'Summary', icon: FileText, group: 'explain' },
  { action: 'eli10', label: 'ELI10', icon: Baby, group: 'language' },
  { action: 'eli5', label: 'ELI5', icon: Baby, group: 'language' },
  { action: 'hinglish', label: 'हिंदी', icon: Languages, group: 'language' },
  { action: 'marathi', label: 'मराठी', icon: Languages, group: 'language' },
  { action: 'examples', label: 'Examples', icon: Sparkles, group: 'practice' },
  { action: 'coding_exercise', label: 'Code', icon: Code2, group: 'practice' },
  { action: 'quiz', label: 'Quiz', icon: ListChecks, group: 'practice' },
  { action: 'flashcards', label: 'Flashcards', icon: Layers, group: 'practice' },
  { action: 'ask', label: 'Ask AI', icon: MessageSquare, group: 'ask' },
]

export interface AINotesToolbarProps {
  subjectName?: string
  lessonTitle?: string
  lessonOverview?: string
  /** Currently highlighted text from the reader (optional). */
  selection?: string
}

export function AINotesToolbar({
  subjectName,
  lessonTitle,
  lessonOverview,
  selection: externalSelection,
}: AINotesToolbarProps) {
  const [activeAction, setActiveAction] = useState<AiAction | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askInput, setAskInput] = useState('')
  const [currentSelection, setCurrentSelection] = useState(externalSelection ?? '')
  const abortRef = useRef<AbortController | null>(null)

  // Track text selection inside the reader
  useEffect(() => {
    const handler = () => {
      const sel = window.getSelection()
      const text = sel?.toString().trim() ?? ''
      setCurrentSelection(text.length > 5 ? text : '')
    }
    document.addEventListener('selectionchange', handler)
    return () => document.removeEventListener('selectionchange', handler)
  }, [])

  const runAction = useCallback(
    async (action: AiAction, question?: string) => {
      // Abort any in-flight request
      abortRef.current?.abort()
      const ctrl = new AbortController()
      abortRef.current = ctrl

      setActiveAction(action)
      setOutput('')
      setError(null)
      setLoading(true)

      try {
        const res = await fetch('/api/notes/ai', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action,
            subjectName,
            lessonTitle,
            lessonOverview,
            selection: currentSelection || undefined,
            question,
          }),
          signal: ctrl.signal,
        })

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}))
          throw new Error(errData?.error?.message || `Request failed (${res.status})`)
        }

        const reader = res.body?.getReader()
        if (!reader) throw new Error('No response body')

        const decoder = new TextDecoder()
        let buffer = ''

        while (true) {
          const { value, done } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })

          // NDJSON: process line by line
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.trim()) continue
            try {
              const evt = JSON.parse(line)
              if (evt.type === 'delta' && evt.delta) {
                setOutput((prev) => prev + evt.delta)
              } else if (evt.type === 'error') {
                setError(evt.message || 'AI error')
              } else if (evt.type === 'done') {
                // stream complete
              }
            } catch {
              /* skip malformed line */
            }
          }
        }
      } catch (err) {
        if ((err as Error).name === 'AbortError') return
        setError(err instanceof Error ? err.message : 'Request failed')
      } finally {
        setLoading(false)
      }
    },
    [subjectName, lessonTitle, lessonOverview, currentSelection],
  )

  const handleAskSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!askInput.trim()) return
    runAction('ask', askInput.trim())
    setAskInput('')
  }

  return (
    <div className="ai-toolbar no-print" role="toolbar" aria-label="AI notes actions">
      {AI_BUTTONS.map((btn) => {
        const Icon = btn.icon
        const isActive = activeAction === btn.action && loading
        return (
          <button
            key={btn.action}
            onClick={() => runAction(btn.action)}
            data-active={isActive ? 'true' : undefined}
            className="ai-toolbar__btn"
            type="button"
            disabled={loading}
            title={currentSelection ? `${btn.label} (selected text)` : btn.label}
          >
            <Icon className="h-3.5 w-3.5" />
            {btn.label}
            {currentSelection && btn.group !== 'ask' && (
              <span className="ml-0.5 text-[9px] font-bold text-amber-500">●</span>
            )}
          </button>
        )
      })}

      {/* Output panel */}
      {activeAction && (output || loading || error) && (
        <div className="basis-full mt-2">
          <div className="rounded-lg border border-primary/30 bg-card overflow-hidden shadow-md">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-primary/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                {loading ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Brain className="h-3.5 w-3.5" />
                )}
                LEO · {AI_BUTTONS.find((b) => b.action === activeAction)?.label}
                {currentSelection && (
                  <span className="text-[10px] font-normal text-amber-600 dark:text-amber-400">
                    · selection
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1">
                {output && !loading && (
                  <button
                    onClick={() => {
                      if ('speechSynthesis' in window) {
                        const utter = new SpeechSynthesisUtterance(
                          output.replace(/[#*`>_\[\]]/g, ''),
                        )
                        utter.rate = 1
                        utter.lang = activeAction === 'marathi' ? 'mr-IN' : 'en-IN'
                        window.speechSynthesis.speak(utter)
                      }
                    }}
                    className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                    title="Listen"
                    type="button"
                  >
                    <Volume2 className="h-3.5 w-3.5" />
                  </button>
                )}
                <button
                  onClick={() => {
                    abortRef.current?.abort()
                    setActiveAction(null)
                    setOutput('')
                    setError(null)
                  }}
                  className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground"
                  title="Close"
                  type="button"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {error ? (
                <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
              ) : output ? (
                <MarkdownRenderer content={output} />
              ) : (
                <p className="text-sm text-muted-foreground">LEO is thinking…</p>
              )}
            </div>

            {/* Ask AI input */}
            {activeAction === 'ask' && (
              <form
                onSubmit={handleAskSubmit}
                className="border-t border-border p-2 flex gap-2"
              >
                <input
                  type="text"
                  value={askInput}
                  onChange={(e) => setAskInput(e.target.value)}
                  placeholder="Ask a follow-up question about this lesson…"
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30"
                  disabled={loading}
                />
                <button
                  type="submit"
                  disabled={loading || !askInput.trim()}
                  className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
                >
                  <Send className="h-3.5 w-3.5" />
                  Send
                </button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
