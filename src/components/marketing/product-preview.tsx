'use client'

import * as React from 'react'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary" className="font-mono text-xs">
          CS201
        </Badge>
        <span className="text-sm font-semibold text-foreground">
          Data Structures - Unit 2
        </span>
      </div>
      <h3 className="text-lg font-bold tracking-tight text-foreground">
        Stacks vs queues
      </h3>
      <p className="text-sm leading-6 text-muted-foreground">
        A <strong className="text-foreground">stack</strong> follows
        Last-In-First-Out order. A{' '}
        <strong className="text-foreground">queue</strong> follows
        First-In-First-Out order.
      </p>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Stack
          </p>
          <p className="mt-1 break-words font-mono text-xs text-foreground">
            push() - pop() - peek()
          </p>
        </div>
        <div className="rounded-lg border border-border bg-muted/40 p-3">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Queue
          </p>
          <p className="mt-1 break-words font-mono text-xs text-foreground">
            enqueue() - dequeue()
          </p>
        </div>
      </div>
    </div>
  )
}

function PracticePreview() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
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
              'flex min-h-11 items-center gap-3 rounded-lg border px-3 py-2.5 text-sm ' +
              (i === 1
                ? 'border-primary bg-primary/5 text-foreground'
                : 'border-border bg-muted/30 text-muted-foreground')
            }
          >
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border border-border text-xs font-bold">
              {String.fromCharCode(65 + i)}
            </span>
            <span className="min-w-0 flex-1">{opt}</span>
            {i === 1 && (
              <CheckCircle2
                className="h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
      <p className="text-xs text-muted-foreground">
        Correctness is scored on the server. XP cannot be forged.
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
          looks like a smaller tree. Traversals naturally follow that shape.
        </p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge variant="secondary" className="gap-1 text-xs">
            <BookOpen className="h-3 w-3" aria-hidden="true" />
            CS201 - Trees - Lesson 4
          </Badge>
          <span className="text-xs text-muted-foreground">
            Grounded in an approved Lernio lesson
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
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-semibold text-foreground">
          Revision queue
        </span>
        <Badge variant="outline">4 due</Badge>
      </div>
      <ul className="space-y-2">
        {cards.map((c) => (
          <li
            key={c.topic}
            className="flex min-h-10 items-center justify-between gap-3 rounded-lg border border-border bg-muted/30 px-3 py-2"
          >
            <span className="min-w-0 break-words text-sm text-foreground">
              {c.topic}
            </span>
            <Badge
              variant={
                c.tone === 'danger'
                  ? 'destructive'
                  : c.tone === 'warning'
                    ? 'secondary'
                    : 'outline'
              }
              className="shrink-0 text-xs"
            >
              {c.due}
            </Badge>
          </li>
        ))}
      </ul>
      <p className="text-xs text-muted-foreground">
        Scheduled by spaced repetition. Weak topics return sooner.
      </p>
    </div>
  )
}

export function ProductPreview() {
  const [tab, setTab] = React.useState<PreviewTab>('learn')

  return (
    <div className="relative w-full min-w-0">
      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border bg-muted/40 px-3 py-3 sm:px-4">
          <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
            <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
          </div>
          <Badge
            variant="outline"
            className="col-span-2 min-w-0 justify-self-start gap-1 text-xs font-normal sm:col-span-1 sm:justify-self-center"
          >
            <Sparkles className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="truncate sm:hidden">Demo preview</span>
            <span className="hidden truncate sm:inline">
              Demo preview - not your account
            </span>
          </Badge>
          <span className="hidden w-12 sm:block" aria-hidden="true" />
        </div>

        <div className="p-4 sm:p-5">
          <Tabs value={tab} onValueChange={(v) => setTab(v as PreviewTab)}>
            <div className="-mx-1 mb-4 overflow-x-auto px-1 pb-1">
              <TabsList className="flex h-auto min-h-11 w-max min-w-full justify-start">
                {TABS.map(({ key, label, icon: Icon }) => (
                  <TabsTrigger
                    key={key}
                    value={key}
                    aria-label={label}
                    className="min-h-10 min-w-12 flex-none gap-1.5 px-3 text-xs sm:min-w-[7rem] sm:text-sm"
                  >
                    <Icon className="h-3.5 w-3.5" aria-hidden="true" />
                    <span className="hidden sm:inline">{label}</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </div>
            <div className="relative min-h-[17rem] sm:min-h-[15rem]">
              <TabsContent value="learn" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
                <LearnPreview />
              </TabsContent>
              <TabsContent value="practice" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
                <PracticePreview />
              </TabsContent>
              <TabsContent value="tutor" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
                <TutorPreview />
              </TabsContent>
              <TabsContent value="revision" className="mt-0 data-[state=active]:animate-in data-[state=active]:fade-in-0">
                <RevisionPreview />
              </TabsContent>
            </div>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
