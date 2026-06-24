'use client'

import { useMemo, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  ChevronDown, ChevronRight, BookOpen, Folder, FileText, CircleDot,
  TrendingUp, Target, Award,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion, AnimatePresence } from 'framer-motion'
import type { Subject } from '@/lib/types'

interface MasteryEntry {
  id: string
  score: number
  state: string // new | learning | weak | revising | proficient | mastered
  topic: {
    id: string
    title: string
    number?: number
    unit: {
      id: string
      number: number
      title?: string
      subject: {
        id: string
        code: string
        name: string
        shortName?: string
        accentColor?: string
        mascotKey?: string
      }
    }
  }
}

const STATE_META: Record<string, { label: string; color: string; dot: string }> = {
  new: { label: 'New', color: 'bg-gray-500/10 text-gray-600 dark:text-gray-400', dot: 'bg-gray-400' },
  learning: { label: 'Learning', color: 'bg-violet-500/10 text-violet-600 dark:text-violet-400', dot: 'bg-violet-500' },
  weak: { label: 'Weak', color: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', dot: 'bg-rose-500' },
  revising: { label: 'Revising', color: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', dot: 'bg-amber-500' },
  proficient: { label: 'Proficient', color: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', dot: 'bg-emerald-500' },
  mastered: { label: 'Mastered', color: 'bg-green-500/10 text-green-600 dark:text-green-400', dot: 'bg-green-500' },
}

interface Props {
  subjects: Subject[]
  mastery: MasteryEntry[]
  lessons: { lessonId: string; completedAt: string | null }[]
  onPractice?: (subjectId: string) => void
}

export function SubjectProgressTree({ subjects, mastery, lessons, onPractice }: Props) {
  // Build a nested map: subject → unit → topic → mastery + completion
  const tree = useMemo(() => {
    const completedLessonTopics = new Set<string>()
    for (const l of lessons) {
      if (l.completedAt) completedLessonTopics.add(l.lessonId)
    }
    // mastery by topicId
    const masteryByTopic = new Map<string, MasteryEntry>()
    for (const m of mastery) masteryByTopic.set(m.topic.id, m)

    const subjectMap = new Map<string, {
      subject: Subject
      units: Map<number, {
        number: number
        title?: string
        topics: MasteryEntry[]
        completedCount: number
        totalCount: number
        avgScore: number
      }>
    }>()

    for (const subject of subjects) {
      subjectMap.set(subject.id, { subject, units: new Map() })
    }

    for (const m of mastery) {
      const subjId = m.topic.unit.subject.id
      const subjEntry = subjectMap.get(subjId)
      if (!subjEntry) continue
      const unitNo = m.topic.unit.number
      if (!subjEntry.units.has(unitNo)) {
        subjEntry.units.set(unitNo, {
          number: unitNo,
          title: m.topic.unit.title,
          topics: [],
          completedCount: 0,
          totalCount: 0,
          avgScore: 0,
        })
      }
      const u = subjEntry.units.get(unitNo)!
      u.topics.push(m)
      u.totalCount += 1
      if (m.state === 'mastered' || m.state === 'proficient') u.completedCount += 1
    }

    // Compute avg scores per unit + subject
    for (const subj of subjectMap.values()) {
      for (const u of subj.units.values()) {
        u.avgScore = u.topics.length > 0
          ? Math.round(u.topics.reduce((a, b) => a + b.score, 0) / u.topics.length)
          : 0
      }
    }

    return Array.from(subjectMap.values()).map((s) => ({
      subject: s.subject,
      units: Array.from(s.units.values()).sort((a, b) => a.number - b.number),
      avgScore: (() => {
        const all = s.units.size > 0
          ? Array.from(s.units.values()).flatMap((u) => u.topics)
          : []
        return all.length > 0 ? Math.round(all.reduce((a, b) => a + b.score, 0) / all.length) : 0
      })(),
      topicCount: Array.from(s.units.values()).reduce((sum, u) => sum + u.totalCount, 0),
      masteredCount: Array.from(s.units.values()).reduce(
        (sum, u) => sum + u.topics.filter((t) => t.state === 'mastered' || t.state === 'proficient').length,
        0,
      ),
    }))
  }, [subjects, mastery, lessons])

  return (
    <Card className="card-lift">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm flex items-center gap-2">
            <Folder className="h-4 w-4 text-primary" />
            Subject Progress Tree
          </CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {tree.reduce((s, x) => s + x.topicCount, 0)} topics
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {tree.length === 0 || tree.every((t) => t.units.length === 0) ? (
          <div className="text-center py-6">
            <Target className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-xs text-muted-foreground">
              Start practising to populate the mastery tree.
            </p>
          </div>
        ) : (
          tree.map((s) => (
            <SubjectNode
              key={s.subject.id}
              entry={s}
              onPractice={onPractice}
            />
          ))
        )}
      </CardContent>
    </Card>
  )
}

function SubjectNode({
  entry,
  onPractice,
}: {
  entry: {
    subject: Subject
    units: {
      number: number
      title?: string
      topics: MasteryEntry[]
      completedCount: number
      totalCount: number
      avgScore: number
    }[]
    avgScore: number
    topicCount: number
    masteredCount: number
  }
  onPractice?: (subjectId: string) => void
}) {
  const [open, setOpen] = useState(false)
  const accent = entry.subject.accentColor || 'var(--primary)'
  const pct = entry.topicCount > 0 ? (entry.masteredCount / entry.topicCount) * 100 : 0

  return (
    <div className="rounded-lg border border-border overflow-hidden">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-3 p-2.5 hover-soft text-left focus-ring"
        aria-expanded={open}
      >
        <div
          className="h-8 w-8 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: `color-mix(in oklch, ${accent} 15%, transparent)`,
            color: accent,
          }}
        >
          <BookOpen className="h-4 w-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium truncate">{entry.subject.name}</p>
            <span className="text-[10px] text-muted-foreground font-mono">
              {entry.subject.code}
            </span>
          </div>
          <div className="flex items-center gap-2 mt-1">
            <Progress value={pct} className="h-1 flex-1" />
            <span className="text-[10px] tabular-nums text-muted-foreground">
              {entry.masteredCount}/{entry.topicCount} · {entry.avgScore}%
            </span>
          </div>
        </div>
        {open ? (
          <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" />
        ) : (
          <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
        )}
      </button>

      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="px-2 pb-2 pt-1 space-y-1 bg-muted/30">
              {entry.units.length === 0 ? (
                <p className="text-xs text-muted-foreground text-center py-2">
                  No mastery data for this subject yet.
                </p>
              ) : (
                entry.units.map((u) => (
                  <UnitNode key={u.number} unit={u} subjectId={entry.subject.id} onPractice={onPractice} />
                ))
              )}
              {onPractice && entry.topicCount > 0 && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => onPractice(entry.subject.id)}
                  className="w-full mt-2 h-7 text-xs"
                >
                  Practice {entry.subject.shortName || entry.subject.code}
                </Button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function UnitNode({
  unit,
  subjectId,
  onPractice,
}: {
  unit: {
    number: number
    title?: string
    topics: MasteryEntry[]
    completedCount: number
    totalCount: number
    avgScore: number
  }
  subjectId: string
  onPractice?: (s: string) => void
}) {
  const [open, setOpen] = useState(false)
  const pct = unit.totalCount > 0 ? (unit.completedCount / unit.totalCount) * 100 : 0

  return (
    <div className="rounded-md border border-border/60">
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center gap-2 p-2 hover-soft text-left focus-ring"
        aria-expanded={open}
      >
        <span className="step-dot" data-state={pct === 100 ? 'done' : pct > 0 ? 'active' : undefined}>
          {unit.number}
        </span>
        <span className="text-xs font-medium flex-1 truncate">
          {unit.title || `Unit ${unit.number}`}
        </span>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {unit.completedCount}/{unit.totalCount} · {unit.avgScore}%
        </span>
        {open ? (
          <ChevronDown className="h-3 w-3 text-muted-foreground" />
        ) : (
          <ChevronRight className="h-3 w-3 text-muted-foreground" />
        )}
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            <ul className="px-2 pb-2 pt-0.5 space-y-0.5">
              {unit.topics.map((t) => {
                const meta = STATE_META[t.state] || STATE_META.new
                return (
                  <li
                    key={t.id}
                    className="tree-line pl-6 py-1 flex items-center gap-2 hover-soft rounded-md"
                  >
                    <FileText className="h-3 w-3 text-muted-foreground shrink-0" />
                    <span className="text-[11px] flex-1 truncate">{t.topic.title}</span>
                    <span className={cn('text-[9px] px-1.5 py-0.5 rounded-full font-medium', meta.color)}>
                      {meta.label}
                    </span>
                    <span className="text-[10px] tabular-nums text-muted-foreground w-8 text-right">
                      {Math.round(t.score)}%
                    </span>
                  </li>
                )
              })}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
