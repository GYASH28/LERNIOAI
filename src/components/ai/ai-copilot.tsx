'use client'

import { useMemo, useRef, useState } from 'react'
import {
  Bot,
  Check,
  Clipboard,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Square,
  X,
} from 'lucide-react'
import { useAppStore } from '@/store/app-store'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { consumeTutorStream, type TutorStreamEvent } from '@/lib/ai/stream-protocol'
import type { ViewKey } from '@/lib/types'
import { cn } from '@/lib/utils'

type CopilotAction = {
  label: string
  prompt: string
}

const ACTIONS: Record<Exclude<ViewKey, 'tutor'>, CopilotAction[]> = {
  dashboard: [
    { label: 'Plan next 30 minutes', prompt: 'Create a focused 30-minute study sprint for me based on the available context.' },
    { label: 'Choose my next task', prompt: 'Recommend the single best study task to do next and explain why in three bullets.' },
    { label: 'Exam-day strategy', prompt: 'Give me a compact exam preparation strategy for today.' },
  ],
  learn: [
    { label: 'Simplify this topic', prompt: 'Explain the current topic in very simple language with one practical example.' },
    { label: 'Memory trick', prompt: 'Create a memorable analogy or mnemonic for the current topic.' },
    { label: 'Exam answer', prompt: 'Turn the current topic into a concise exam-ready answer.' },
  ],
  practice: [
    { label: 'Give one hint', prompt: 'Give only one useful hint for the problem I am working on. Do not reveal the final answer.' },
    { label: 'Explain a mistake', prompt: 'Explain the most common mistake students make in this topic and how to avoid it.' },
    { label: 'Make 3 questions', prompt: 'Create three short practice questions from easy to exam level, with answers at the end.' },
  ],
  labs: [
    { label: 'Explain the lab', prompt: 'Explain the current lab concept, objective, procedure, and expected result.' },
    { label: 'Safety checklist', prompt: 'Create a short pre-lab checklist with common errors to avoid.' },
    { label: 'Viva questions', prompt: 'Create five viva questions for this lab with one-line answers.' },
  ],
  coding: [
    { label: 'Debug code', prompt: 'Help me debug the code I paste below. Identify the exact issue and show the smallest correction.\n\nCode:\n' },
    { label: 'Generate tests', prompt: 'Generate useful edge cases and test inputs for the coding problem I describe.' },
    { label: 'Explain complexity', prompt: 'Explain the time and space complexity of the approach I paste below.\n\nApproach:\n' },
  ],
  exams: [
    { label: 'Revision checklist', prompt: 'Create a compact revision checklist for the current subject before an exam.' },
    { label: 'Answer strategy', prompt: 'Give a marks-focused strategy for writing strong diploma exam answers.' },
    { label: 'Rapid quiz', prompt: 'Quiz me with five quick questions. Put answers after all questions.' },
  ],
  revision: [
    { label: 'Make flashcards', prompt: 'Create six high-value flashcards for the current topic.' },
    { label: 'Active recall', prompt: 'Give me a five-minute active recall drill for the current topic.' },
    { label: 'Weak-point review', prompt: 'List likely weak points in this topic and a short sequence to fix them.' },
  ],
  materials: [
    { label: 'Summarise notes', prompt: 'Summarise the study material I paste below into key ideas, formulas, and exam questions.\n\nMaterial:\n' },
    { label: 'Extract questions', prompt: 'Extract likely exam questions from the material I paste below.\n\nMaterial:\n' },
    { label: 'Create quick notes', prompt: 'Convert the material I paste below into compact revision notes.\n\nMaterial:\n' },
  ],
  planner: [
    { label: 'Build today’s plan', prompt: 'Create a realistic study plan for today using my available daily minutes.' },
    { label: 'Balance subjects', prompt: 'Suggest how to balance difficult and easy subjects in my study schedule.' },
    { label: 'Catch-up plan', prompt: 'Create a practical catch-up plan for work I have fallen behind on.' },
  ],
  analytics: [
    { label: 'Interpret progress', prompt: 'Explain how to interpret my learning progress and identify the next useful action. Do not invent data.' },
    { label: 'Improve consistency', prompt: 'Give me a simple plan to improve study consistency based on my daily study target.' },
    { label: 'Weekly review', prompt: 'Give me a short weekly learning review template I can use with my analytics.' },
  ],
  profile: [
    { label: 'Set a learning goal', prompt: 'Help me create one measurable learning goal for the next seven days.' },
    { label: 'Choose daily time', prompt: 'Recommend a realistic daily study-time target and a simple routine.' },
    { label: 'Study preferences', prompt: 'Help me define study preferences that make Lernio more useful for me.' },
  ],
  community: [
    { label: 'Suggest an answer', prompt: 'Help me write a helpful answer to a classmate\'s question about this topic.' },
    { label: 'Formulate a question', prompt: 'Help me phrase a clear question I can post in the community discussions.' },
  ],
  leaderboard: [
    { label: 'Study motivation', prompt: 'Give me a short motivational tip to climb the leaderboard this week.' },
  ],
  achievements: [
    { label: 'Next badge', prompt: 'Suggest one achievable learning goal that could unlock my next badge.' },
  ],
  notifications: [
    { label: 'Catch up', prompt: 'Summarise what I might have missed and what to prioritise today.' },
  ],
  attendance: [
    { label: 'Attendance tips', prompt: 'Give me tips to maintain good attendance while balancing studies.' },
  ],
  class: [
    { label: 'Class activity', prompt: 'Suggest a collaborative study activity I can do with my classmates.' },
  ],
}

export function AiCopilot() {
  const {
    user,
    view,
    subjects,
    currentSubjectId,
    currentUnitNumber,
    currentTopicId,
    currentMode,
    continueLearning,
  } = useAppStore()
  const [open, setOpen] = useState(false)
  const [expanded, setExpanded] = useState(false)
  const [draft, setDraft] = useState('')
  const [answer, setAnswer] = useState('')
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [latency, setLatency] = useState<number | null>(null)
  const [copied, setCopied] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  const context = useMemo(() => {
    const subject = subjects.find((item) => item.id === currentSubjectId)
    const unit = subject?.units.find((item) => item.number === currentUnitNumber)
    const topic = unit?.topics.find((item) => item.id === currentTopicId)
    return {
      subjectName: subject?.name || continueLearning?.subjectName,
      topicTitle: topic?.title || continueLearning?.topicTitle,
      unitNumber: currentUnitNumber || continueLearning?.unitNumber,
      learningMode: currentMode,
      examDate: user?.examDate || undefined,
      dailyMinutes: user?.dailyMins,
    }
  }, [continueLearning, currentMode, currentSubjectId, currentTopicId, currentUnitNumber, subjects, user])

  if (!user || view === 'tutor') return null

  const actions = ACTIONS[view as Exclude<ViewKey, 'tutor'>] || ACTIONS.dashboard

  const stop = () => {
    abortRef.current?.abort()
    abortRef.current = null
    setSending(false)
  }

  const run = async (prompt = draft, actionLabel = 'Custom help') => {
    const clean = prompt.trim()
    if (!clean || sending) return

    setOpen(true)
    setDraft(prompt)
    setAnswer('')
    setError('')
    setLatency(null)
    setSending(true)
    setCopied(false)

    const controller = new AbortController()
    abortRef.current = controller

    try {
      const response = await fetch('/api/ai/action/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          view,
          action: actionLabel,
          prompt: clean,
          context,
        }),
      })

      await consumeTutorStream(response, (event: TutorStreamEvent) => {
        if (event.type === 'delta') {
          setAnswer((current) => current + event.text)
        } else if (event.type === 'done') {
          setAnswer(event.message.content)
          setLatency(event.firstTokenMs ?? event.totalMs)
        } else if (event.type === 'error') {
          setError(event.message)
        }
      })
    } catch (requestError) {
      if ((requestError as Error).name !== 'AbortError') {
        setError(requestError instanceof Error ? requestError.message : 'LEO could not complete this action.')
      }
    } finally {
      abortRef.current = null
      setSending(false)
    }
  }

  const copy = async () => {
    if (!answer) return
    await navigator.clipboard.writeText(answer)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1500)
  }

  return (
    <>
      <button
        type="button"
        className="fixed bottom-[calc(5rem+env(safe-area-inset-bottom))] right-4 z-40 inline-flex min-h-12 items-center gap-2 rounded-full border border-primary/25 bg-background/90 px-4 py-2 text-sm font-bold text-foreground shadow-lg backdrop-blur transition hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-xl md:bottom-5"
        onClick={() => setOpen(true)}
        aria-label="Open LEO copilot"
      >
        <span className="relative grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
          <Bot className="h-4 w-4" aria-hidden="true" />
          <span className="absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full border-2 border-background bg-success" />
        </span>
        Ask LEO
      </button>

      {open ? (
        <aside
          className={cn(
            'fixed z-50 flex flex-col overflow-hidden border border-border bg-background/96 shadow-2xl backdrop-blur-xl',
            expanded
              ? 'inset-3 rounded-2xl md:inset-8'
              : 'bottom-3 right-3 top-auto h-[min(680px,calc(100svh-1.5rem))] w-[min(430px,calc(100vw-1.5rem))] rounded-2xl',
          )}
          aria-label="LEO context copilot"
        >
          <header className="border-b border-border bg-gradient-to-r from-primary/10 via-background to-violet-500/10 p-4">
            <div className="flex items-center gap-3">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <h2 className="font-bold">LEO Copilot</h2>
                <p className="truncate text-xs text-muted-foreground">
                  Context-aware help for {view.replaceAll('_', ' ')}
                </p>
              </div>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setExpanded((value) => !value)}
                aria-label={expanded ? 'Restore copilot size' : 'Expand copilot'}
              >
                {expanded ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
              </Button>
              <Button
                variant="ghost"
                size="icon"
                className="h-9 w-9"
                onClick={() => setOpen(false)}
                aria-label="Close LEO copilot"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>

            <div className="mt-3 flex flex-wrap gap-1.5">
              {context.subjectName ? (
                <span className="rounded-full border border-primary/20 bg-primary/5 px-2.5 py-1 text-[11px] font-semibold text-primary">
                  {context.subjectName}
                </span>
              ) : null}
              {context.topicTitle ? (
                <span className="max-w-full truncate rounded-full border bg-muted/50 px-2.5 py-1 text-[11px] font-semibold text-muted-foreground">
                  {context.topicTitle}
                </span>
              ) : null}
            </div>
          </header>

          <div className="flex-1 overflow-y-auto p-4">
            <div className="grid gap-2 sm:grid-cols-3">
              {actions.map((action) => (
                <button
                  key={action.label}
                  type="button"
                  onClick={() => void run(action.prompt, action.label)}
                  disabled={sending}
                  className="rounded-xl border border-border bg-card p-3 text-left text-xs font-semibold transition hover:border-primary/40 hover:bg-primary/5 disabled:opacity-50"
                >
                  <Sparkles className="mb-2 h-4 w-4 text-primary" />
                  {action.label}
                </button>
              ))}
            </div>

            <div className="mt-4 min-h-52 rounded-2xl border border-border bg-muted/20 p-4">
              {!answer && !sending && !error ? (
                <div className="flex min-h-44 flex-col items-center justify-center text-center text-sm text-muted-foreground">
                  <Bot className="mb-3 h-8 w-8 text-primary/60" />
                  Choose a quick action or describe what you need.
                </div>
              ) : null}

              {sending && !answer ? (
                <div className="flex min-h-44 flex-col items-center justify-center text-center">
                  <div className="relative mb-4 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
                    <Bot className="h-6 w-6" />
                    <span className="absolute inset-0 rounded-full border border-primary/30 animate-ping" />
                  </div>
                  <p className="font-semibold">LEO is preparing a focused answer</p>
                  <p className="mt-1 text-xs text-muted-foreground">The first words will appear as soon as they are generated.</p>
                </div>
              ) : null}

              {answer ? (
                <div className="ai-stream-text whitespace-pre-wrap text-sm leading-6 text-foreground">
                  {answer}
                  {sending ? <span className="ml-1 inline-block h-4 w-1.5 animate-pulse rounded-sm bg-primary align-middle" /> : null}
                </div>
              ) : null}

              {error ? (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm font-medium text-destructive">
                  {error}
                </div>
              ) : null}
            </div>

            {answer ? (
              <div className="mt-2 flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <span>{latency !== null ? `First response in ${(latency / 1000).toFixed(1)}s` : 'Streaming response'}</span>
                <Button variant="ghost" size="sm" className="h-8 gap-1.5" onClick={() => void copy()}>
                  {copied ? <Check className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                  {copied ? 'Copied' : 'Copy'}
                </Button>
              </div>
            ) : null}
          </div>

          <footer className="border-t border-border bg-background p-3">
            <div className="rounded-2xl border border-border bg-card p-2 shadow-sm">
              <Textarea
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' && !event.shiftKey) {
                    event.preventDefault()
                    void run()
                  }
                }}
                placeholder="Ask for an explanation, plan, hint, quiz, summary, or debugging help..."
                className="min-h-20 resize-none border-0 bg-transparent shadow-none focus-visible:ring-0"
                disabled={sending}
              />
              <div className="flex items-center justify-between px-1 pb-1">
                <span className="text-[11px] text-muted-foreground">Enter to send · Shift+Enter for a new line</span>
                {sending ? (
                  <Button variant="destructive" size="sm" onClick={stop} className="gap-1.5">
                    <Square className="h-3.5 w-3.5" />
                    Stop
                  </Button>
                ) : (
                  <Button size="sm" onClick={() => void run()} disabled={!draft.trim()} className="gap-1.5">
                    <Send className="h-3.5 w-3.5" />
                    Ask
                  </Button>
                )}
              </div>
            </div>
          </footer>
        </aside>
      ) : null}
    </>
  )
}
