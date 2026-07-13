'use client'
import { useState } from 'react'
import { Brain, Sparkles, Languages, Baby, Code2, ListChecks, Layers, FileText, MessageSquare, X, Loader2, Send } from 'lucide-react'
import { MarkdownRenderer } from './markdown-renderer'

type AiAction = 'explain' | 'simplify' | 'hinglish' | 'marathi' | 'eli10' | 'examples' | 'coding_exercise' | 'quiz' | 'flashcards' | 'summary' | 'ask'

const BUTTONS: Array<{ action: AiAction; label: string; icon: typeof Brain }> = [
  { action: 'explain', label: 'Explain', icon: Brain },
  { action: 'simplify', label: 'Simplify', icon: Sparkles },
  { action: 'summary', label: 'Summary', icon: FileText },
  { action: 'eli10', label: 'ELI10', icon: Baby },
  { action: 'hinglish', label: 'हिंदी', icon: Languages },
  { action: 'marathi', label: 'मराठी', icon: Languages },
  { action: 'examples', label: 'Examples', icon: Sparkles },
  { action: 'coding_exercise', label: 'Code', icon: Code2 },
  { action: 'quiz', label: 'Quiz', icon: ListChecks },
  { action: 'flashcards', label: 'Flashcards', icon: Layers },
  { action: 'ask', label: 'Ask AI', icon: MessageSquare },
]

export function AINotesToolbar({ subjectName, lessonTitle, lessonOverview }: {
  subjectName?: string; lessonTitle?: string; lessonOverview?: string
}) {
  const [active, setActive] = useState<AiAction | null>(null)
  const [output, setOutput] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [askInput, setAskInput] = useState('')

  const runAction = async (action: AiAction, question?: string) => {
    setActive(action); setOutput(''); setError(null); setLoading(true)
    try {
      const res = await fetch('/api/notes/ai', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, subjectName, lessonTitle, lessonOverview, question }),
      })
      if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e?.error?.message || `Request failed (${res.status})`) }
      const reader = res.body?.getReader()
      if (!reader) throw new Error('No response body')
      const decoder = new TextDecoder(); let buffer = ''
      while (true) {
        const { value, done } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n'); buffer = lines.pop() ?? ''
        for (const line of lines) {
          if (!line.trim()) continue
          try { const evt = JSON.parse(line)
            if (evt.type === 'delta' && evt.delta) setOutput(p => p + evt.delta)
            else if (evt.type === 'error') setError(evt.message || 'AI error')
          } catch {}
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'Request failed')
    } finally { setLoading(false) }
  }

  return (
    <div className="ai-toolbar no-print" role="toolbar" aria-label="AI notes actions">
      {BUTTONS.map((btn) => {
        const Icon = btn.icon; const isActive = active === btn.action && loading
        return (
          <button key={btn.action} onClick={() => runAction(btn.action)} data-active={isActive ? 'true' : undefined}
            className="ai-toolbar__btn" type="button" disabled={loading}>
            <Icon className="h-3.5 w-3.5"/>{btn.label}
          </button>
        )
      })}
      {active && (output || loading || error) && (
        <div className="basis-full mt-2">
          <div className="rounded-lg border border-primary/30 bg-card overflow-hidden shadow-md">
            <div className="flex items-center justify-between border-b border-border px-3 py-2 bg-primary/5">
              <div className="flex items-center gap-2 text-xs font-semibold text-primary">
                {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin"/> : <Brain className="h-3.5 w-3.5"/>}
                LEO · {BUTTONS.find(b => b.action === active)?.label}
              </div>
              <button onClick={() => { setActive(null); setOutput(''); setError(null) }} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground" type="button"><X className="h-3.5 w-3.5"/></button>
            </div>
            <div className="max-h-[60vh] overflow-y-auto p-3">
              {error ? <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
                : output ? <MarkdownRenderer content={output}/>
                : <p className="text-sm text-muted-foreground">LEO is thinking…</p>}
            </div>
            {active === 'ask' && (
              <form onSubmit={(e) => { e.preventDefault(); if (askInput.trim()) runAction('ask', askInput.trim()); setAskInput('') }} className="border-t border-border p-2 flex gap-2">
                <input type="text" value={askInput} onChange={(e) => setAskInput(e.target.value)} placeholder="Ask a follow-up…" className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary/30" disabled={loading}/>
                <button type="submit" disabled={loading || !askInput.trim()} className="inline-flex items-center gap-1 rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"><Send className="h-3.5 w-3.5"/>Send</button>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
