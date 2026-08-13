'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Separator } from '@/components/ui/separator'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  RotateCw, Clock, Brain, Zap, CheckCircle2, AlertCircle, Calendar,
  Layers, BookOpen, Star, ChevronRight, RefreshCw, Sparkles, ArrowUpRight
} from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'
import { FlashcardPlayer } from '@/components/ui/flashcard-player'

interface RevisionScheduleItem {
  id: string
  topicId: string
  state: string
  nextDueDate: string | Date
  easeFactor: number
  interval: number
  repetitions: number
  lapses: number
  topic: {
    id: string
    title: string
    description?: string | null
    unit?: {
      number: number
      subject?: {
        name: string
        code: string
        mascotKey?: string | null
      } | null
    } | null
  }
  sourceLesson?: {
    title: string
    canonicalUrl?: string
  } | null
}

const STATE_COLORS: Record<string, string> = {
  new: 'bg-gray-500/10 text-gray-600',
  learning: 'bg-violet-500/10 text-violet-600',
  weak: 'bg-rose-500/10 text-rose-600',
  revising: 'bg-amber-500/10 text-amber-600',
  proficient: 'bg-emerald-500/10 text-emerald-600',
  mastered: 'bg-green-500/10 text-green-600',
}

export function RevisionView() {
  const [data, setData] = useState<{ dueToday: RevisionScheduleItem[]; overdue: RevisionScheduleItem[]; upcoming: RevisionScheduleItem[]; all: RevisionScheduleItem[] } | null>(null)
  const [session, setSession] = useState<{ items: RevisionScheduleItem[]; idx: number; phase: 'study' | 'rate' } | null>(null)
  const [showFront, setShowFront] = useState(true)
  const [mode, setMode] = useState<'classic' | 'flashcards'>('classic')
  const { pushMascotToast } = useAppStore()

  const load = () => {
    fetch('/api/revision/due').then(r => r.json()).then(d => setData(d.data))
  }
  useEffect(() => { load() }, [])

  const startSession = (items: RevisionScheduleItem[]) => {
    if (items.length === 0) return
    setSession({ items, idx: 0, phase: 'study' })
    setShowFront(true)
  }

  const rate = async (quality: number) => {
    if (!session) return
    const item = session.items[session.idx]
    await fetch('/api/revision/due', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ scheduleId: item.id, quality, topicId: item.topicId }),
    })
    if (session.idx + 1 >= session.items.length) {
      pushMascotToast({ mascot: 'leo', state: 'achievement', message: `Revision complete! You reviewed ${session.items.length} topics. +${session.items.length * 8} XP` })
      setSession(null)
      load()
    } else {
      setSession({ ...session, idx: session.idx + 1, phase: 'study' })
      setShowFront(true)
    }
  }

  const dueToday = data?.dueToday || []
  const overdue = data?.overdue || []
  const upcoming = data?.upcoming || []
  const mastered = (data?.all || []).filter(r => r.state === 'mastered').length
  const total = (data?.all || []).length

  if (session) {
    const item = session.items[session.idx]
    const topic = item.topic
    const subject = topic?.unit?.subject
    const sourceLesson = item.sourceLesson
    return (
      <div className="max-w-2xl mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <Badge variant="secondary">{session.idx + 1} of {session.items.length}</Badge>
          <Button variant="ghost" size="sm" onClick={() => { setSession(null); load() }}>Exit Session</Button>
        </div>
        <Progress value={((session.idx + 1) / session.items.length) * 100} className="h-1.5" />

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center gap-3 mb-4">
              <Mascot mascot={(subject?.mascotKey || 'leo') as 'leo'} state="explaining" size={48} />
              <div>
                <p className="text-xs text-muted-foreground">{subject?.name} · Unit {topic?.unit?.number}</p>
                <p className="font-medium">{topic?.title}</p>
                {sourceLesson?.canonicalUrl ? (
                  <Link
                    href={sourceLesson.canonicalUrl}
                    className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
                  >
                    Return to lesson
                    <ArrowUpRight className="h-3 w-3" />
                  </Link>
                ) : null}
              </div>
            </div>

            <AnimatePresence mode="wait">
              {session.phase === 'study' && (
                <motion.div key="study" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="rounded-xl border-2 border-dashed border-primary/30 p-6 min-h-40 flex flex-col items-center justify-center text-center">
                    <Layers className="h-8 w-8 text-primary mb-2" />
                    <p className="text-sm text-muted-foreground mb-3">Flashcard · Front</p>
                    <p className="text-lg font-medium">{topic?.title}</p>
                    {showFront ? (
                      <p className="text-xs text-muted-foreground mt-1">Click to reveal the answer</p>
                    ) : null}
                  </div>
                  {!showFront ? (
                    <div className="mt-3 rounded-xl bg-muted/50 p-4 text-center">
                      <p className="text-sm">{topic?.description || `Review the key concepts of ${topic?.title}.`}</p>
                    </div>
                  ) : null}
                  {showFront ? (
                    <Button onClick={() => setShowFront(false)} className="w-full mt-3 gap-2">
                      Reveal Answer
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  ) : (
                    <Button onClick={() => setSession({ ...session, phase: 'rate' })} className="w-full mt-3 gap-2">
                      Show Rating
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  )}
                </motion.div>
              )}

              {session.phase === 'rate' && (
                <motion.div key="rate" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                  <p className="text-sm font-medium text-center mb-4">How well did you remember this?</p>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {[
                      { q: 1, label: 'Again', desc: 'Didn\'t know', color: 'border-rose-500 text-rose-600 hover:bg-rose-500/10' },
                      { q: 2, label: 'Hard', desc: 'Struggled', color: 'border-amber-500 text-amber-600 hover:bg-amber-500/10' },
                      { q: 3, label: 'Good', desc: 'Some effort', color: 'border-blue-500 text-blue-600 hover:bg-blue-500/10' },
                      { q: 4, label: 'Easy', desc: 'Knew it well', color: 'border-emerald-500 text-emerald-600 hover:bg-emerald-500/10' },
                      { q: 5, label: 'Perfect', desc: 'Instant recall', color: 'border-green-500 text-green-600 hover:bg-green-500/10' },
                    ].map((r) => (
                      <button key={r.q} onClick={() => rate(r.q)} className={cn('p-3 rounded-lg border-2 text-center transition-all', r.color)}>
                        <p className="font-medium text-sm">{r.label}</p>
                        <p className="text-meta opacity-70">{r.desc}</p>
                      </button>
                    ))}
                  </div>
                  <p className="text-meta text-muted-foreground text-center mt-3 italic">
                    One wrong answer won't destroy your long-term mastery score.
                  </p>
                </motion.div>
              )}
            </AnimatePresence>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header — premium hero */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/15 shadow-soft">
        <div className="h-12 w-12 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center shrink-0">
          <Mascot mascot="leo" state="hinting" size={40} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            <span className="text-gradient-warm">Smart Revision</span>
          </h2>
          <p className="text-sm text-muted-foreground">Spaced repetition that adapts to your memory.</p>
        </div>
        <div className="hidden sm:block">
          <div className="text-right">
            <p className="text-2xl font-bold text-amber-700 dark:text-amber-300 tabular-nums leading-none">{Math.round((mastered / Math.max(total, 1)) * 100)}%</p>
            <p className="text-meta text-muted-foreground">mastered</p>
          </div>
        </div>
      </div>

      {/* Stats — premium tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Clock className="h-4 w-4" />} value={dueToday.length} label="Due Today" tint="amber" />
        <StatTile icon={<AlertCircle className="h-4 w-4" />} value={overdue.length} label="Overdue" tint="rose" />
        <StatTile icon={<CheckCircle2 className="h-4 w-4" />} value={mastered} label="Mastered" tint="emerald" />
        <StatTile icon={<Brain className="h-4 w-4" />} value={total} label="Total Topics" tint="primary" />
      </div>

      {/* Mode tabs — Classic list vs. 3D Flashcards */}
      <Tabs value={mode} onValueChange={(v) => setMode(v as 'classic' | 'flashcards')}>
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="classic" className="gap-1.5">
            <Layers className="h-3.5 w-3.5" /> Classic List
          </TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-1.5">
            <Sparkles className="h-3.5 w-3.5" /> 3D Flashcards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="flashcards" className="mt-4">
          <FlashcardPlayer onExit={() => { setMode('classic'); load() }} />
        </TabsContent>

        <TabsContent value="classic" className="mt-4 space-y-4">
      {/* Due Today */}
      <Card className={cn('card-lift', dueToday.length > 0 && 'border-amber-500/30')}>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                <RotateCw className="h-4 w-4 text-amber-500" />
              </div>
              <CardTitle className="text-base">Due Today</CardTitle>
            </div>
            {dueToday.length > 0 && (
              <Button size="sm" onClick={() => startSession(dueToday)} className="gap-1.5">
                <Zap className="h-3.5 w-3.5" /> Start Session
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {dueToday.length > 0 ? (
            <div className="space-y-2">
              {dueToday.map((r) => <RevisionItem key={r.id} item={r} />)}
            </div>
          ) : (
            <div className="text-center py-8">
              <Mascot mascot="leo" state="achievement" size={64} className="mx-auto mascot-float" />
              <p className="text-sm font-medium mt-3">
                <span className="text-gradient">All caught up!</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">No revisions due today. Great job staying on track.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <Card className="card-lift">
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center">
                <Calendar className="h-4 w-4 text-muted-foreground" />
              </div>
              <CardTitle className="text-base">Upcoming</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-48">
              <div className="space-y-2">
                {upcoming.map((r) => <RevisionItem key={r.id} item={r} />)}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {/* Topic States Overview */}
      {(data?.all || []).length > 0 && (
        <Card className="card-lift">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Brain className="h-4 w-4 text-primary" />
              All Topics by State
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-2">
              {(['new', 'learning', 'weak', 'revising', 'proficient', 'mastered'] as string[]).map((state) => {
                const items = (data?.all || []).filter((r) => r.state === state)
                if (items.length === 0) return null
                return (
                  <button
                    key={state}
                    className={cn('rounded-lg px-3 py-1.5 text-xs font-medium capitalize hover-soft focus-ring', STATE_COLORS[state])}
                  >
                    {state}: <span className="tabular-nums">{items.length}</span>
                  </button>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
        </TabsContent>
      </Tabs>
    </div>
  )
}

function RevisionItem({ item }: { item: RevisionScheduleItem }) {
  const [snoozed, setSnoozed] = useState(false)
  const topic = item.topic
  const subject = topic?.unit?.subject
  const sourceLesson = item.sourceLesson
  const snooze = () => {
    // Snooze is a client-side temporary dismissal — it does NOT call the
    // revision API or send a quality rating. Sending quality=2 would
    // lapse the SM-2 schedule and damage the ease factor, which is the
    // wrong behavior for a snooze (the student hasn't reviewed the card,
    // they just want to see it later).
    setSnoozed(true)
  }
  if (snoozed) return null
  return (
    <div className="flex items-center gap-3 p-2.5 rounded-lg border border-border hover-soft card-lift">
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center shrink-0', STATE_COLORS[item.state])}>
        <Layers className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{topic?.title}</p>
        {sourceLesson?.canonicalUrl ? (
          <Link
            href={sourceLesson.canonicalUrl}
            className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-primary"
          >
            {sourceLesson.title}
            <ArrowUpRight className="h-3 w-3" />
          </Link>
        ) : null}
        <p className="text-meta text-muted-foreground font-mono">{subject?.code} · Unit {topic?.unit?.number}</p>
      </div>
      <Badge variant="outline" className={cn('text-meta capitalize', STATE_COLORS[item.state])}>{item.state}</Badge>
      <Button variant="ghost" size="sm" onClick={snooze} className="text-xs hover-soft">Snooze</Button>
    </div>
  )
}

function StatTile({ icon, value, label, tint }: { icon: React.ReactNode; value: number; label: string; tint: 'primary' | 'amber' | 'emerald' | 'rose' }) {
  const tintClasses: Record<typeof tint, string> = {
    primary: 'stat-tile-tint-primary text-primary',
    amber: 'stat-tile-tint-amber text-amber-500',
    emerald: 'stat-tile-tint-emerald text-emerald-500',
    rose: 'stat-tile-tint-rose text-rose-500',
  }
  const bgClasses: Record<typeof tint, string> = {
    primary: 'bg-primary/10',
    amber: 'bg-amber-500/10',
    emerald: 'bg-emerald-500/10',
    rose: 'bg-rose-500/10',
  }
  return (
    <div className={cn('stat-tile p-3 flex items-center gap-3', tintClasses[tint])}>
      <div className={cn('h-9 w-9 rounded-lg flex items-center justify-center', bgClasses[tint])}>
        {icon}
      </div>
      <div>
        <p className="text-lg font-bold leading-none tabular-nums">{value}</p>
        <p className="text-meta text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}
