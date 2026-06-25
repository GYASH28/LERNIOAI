'use client'

import * as React from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  BookOpen,
  PenTool,
  Bot,
  RotateCw,
  CheckCircle2,
  Sparkles,
} from 'lucide-react'

type PreviewTab = 'learn' | 'practice' | 'tutor' | 'revision'

const TABS: { key: PreviewTab; label: string; icon: typeof BookOpen }[] = [
  { key: 'learn', label: 'Learn', icon: BookOpen },
  { key: 'practice', label: 'Practice', icon: PenTool },
  { key: 'tutor', label: 'AI Tutor', icon: Bot },
  { key: 'revision', label: 'Revision', icon: RotateCw },
]

function LearnPreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Badge variant="secondary" className="font-mono text-[0.625rem]">
          CS201
        </Badge>
        <span className="text-sm font-semibold text-foreground">
          Data Structures · Unit 2
        </span>
      </div>
      <h3 className="text-lg font-bold tracking-tight text-foreground">
        Stacks vs Queues
      </h3>
      <p className="text-sm leading-6 text-muted-foreground">
        A <strong className="text-foreground">stack</strong> follows
        Last-In-First-Out (LIFO) order — think of a stack of plates. A{' '}
        <strong className="text-foreground">queue</strong> follows
        First-In-First-Out (FIFO) order — think of a line at a ticket counter.
      </p>
      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stack
          </p>
          <p className="mt-1 font-mono text-xs text-foreground">push() · pop() · peek()</p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Queue
          </p>
          <p className="mt-1 font-mono text-xs text-foreground">enqueue() · dequeue()</p>
        </div>
      </div>
    </div>
  )
}

function PracticePreview() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Question 3 of 10
        </span>
        <Badge variant="outline" className="gap-1">
          <Sparkles className="h-3 w-3" aria-hidden="true" />
          Adaptive
        </Badge>
      </div>
      <p className="text-sm leading-6 text-foreground">
        Which data structure is most appropriate for implementing a function
        call stack?
      </p>
      <div className="space-y-2">
        {['Queue', 'Stack', 'Heap', 'Graph'].map((opt, i) => (
          <div
            key={opt}
            className={
              'flex items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ' +
              (i === 1
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-muted/30 text-muted-foreground')
            }
          >
            <span className="grid h-5 w-5 place-items-center rounded-full border border-border text-[0.625rem] font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            {opt}
            {i === 1 && (
              <CheckCircle2
                className="ml-auto h-4 w-4 text-primary"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Correctness is scored on the server — XP cannot be forged.
      </p>
    </div>
  )
}

function TutorPreview() {
  return (
    <div className="space-y-3">
      <div className="rounded-lg rounded-br-sm border border-border bg-muted/40 p-3 text-sm text-foreground">
        Why is recursion useful for tree traversals?
      </div>
      <div className="rounded-lg rounded-bl-sm border border-primary/30 bg-primary/5 p-3 text-sm leading-6 text-foreground">
        <p>
          Recursion mirrors the self-similar structure of a tree: each subtree
          looks like a smaller tree. A pre-order traversal visits the root,
          then recursively visits each child — which is exactly how the call
          stack naturally unwinds.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-[0.625rem]">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            CS201 · Trees · Lesson 4
          </Badge>
          <span className="text-[0.625rem] text-muted-foreground">
            Grounded in approved Lernio lesson
          </span>
        </div>
      </div>
    </div>
  )
}

function RevisionPreview() {
  const cards = [
    { topic: 'Linked lists', due: 'Today', tone: 'danger' as const },
    { topic: 'Infix to postfix', due: 'Today', tone: 'danger' as const },
    { topic: 'Binary search', due: 'Tomorrow', tone: 'warning' as const },
    { topic: 'Hashing', due: 'Fri', tone: 'default' as const },
  ]
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground">
          Revision queue
        </span>
        <Badge variant="outline">4 due</Badge>
      </div>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li
            key={c.topic}
            className="flex items-center justify-between rounded-lg border border-border bg-muted/30 px-3 py-2"
          >
            <span className="text-sm text-foreground">{c.topic}</span>
            <Badge
              variant={c.tone === 'danger' ? 'destructive' : c.tone === 'warning' ? 'secondary' : 'outline'}
              className="text-[0.625rem]"
            >
              {c.due}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Scheduled by spaced repetition — weak topics return sooner.
      </p>
    </div>
  )
}

export function ProductPreview() {
  const [tab, setTab] = React.useState<PreviewTab>('learn')
  const reduceMotion = useReducedMotion()

  return (
    <div className="relative w-full">
      {/* Preview frame */}
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        {/* Window chrome */}
        <div className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2.5">
          <div className="flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" aria-hidden="true" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" aria-hidden="true" />
          </div>
          <Badge variant="outline" className="gap-1 text-[0.625rem] font-normal">
            <Sparkles className="h-3 w-3" aria-hidden="true" />
            Demo preview — not your account
          </Badge>
          <span className="w-12" />
        </div>

        {/* Tabs */}
        <div className="p-4 sm:p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as PreviewTab)}>
            <TabsList className="mb-4 grid w-full grid-cols-4">
              {TABS.map(({ key, label, icon: Icon }) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="gap-1.5 text-xs sm:text-sm"
                >
                  <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                  <span className="hidden sm:inline">{label}</span>
                </TabsTrigger>
              ))}
            </TabsList>
            <div className="relative min-h-[16rem]">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={tab}
                  initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -6 }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                >
                  {tab === 'learn' && <LearnPreview />}
                  {tab === 'practice' && <PracticePreview />}
                  {tab === 'tutor' && <TutorPreview />}
                  {tab === 'revision' && <RevisionPreview />}
                </motion.div>
              </AnimatePresence>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
