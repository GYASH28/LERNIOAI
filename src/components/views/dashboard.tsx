'use client'

import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot, MascotWithBubble } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { ScrollArea } from '@/components/ui/scroll-area'
import { StreakHeatmap } from '@/components/ui/streak-heatmap'
import { WeeklyXpChart } from '@/components/ui/weekly-xp-chart'
import { DailyGoalRing } from '@/components/ui/daily-goal-ring'
import { DailyQuestsCard } from '@/components/ui/daily-quests'
import { StreakFreezeWidget } from '@/components/ui/streak-freeze-widget'
import { AchievementWall } from '@/components/ui/achievement-wall'
import {
  BookOpen, RotateCw, CalendarCheck, Clock, TrendingDown, Trophy,
  Flame, Zap, ArrowRight, Play, CheckCircle2, AlertCircle, Sparkles,
  PenTool, Bot, Code2, FlaskConical, FileText, Library, Target
} from 'lucide-react'
import { motion } from 'framer-motion'
import { cn } from '@/lib/utils'
import type { Subject } from '@/lib/types'
import type { DashboardSnapshot } from '@/lib/app-bootstrap-types'

interface DashboardData {
  mastery: any[]
  lessonCompletions: any[]
  questionAttempts: any[]
  quizAttempts: any[]
  studySessions: any[]
}

export function DashboardView({ initialData = null }: { initialData?: DashboardSnapshot | null }) {
  const { user, subjects, setView, setLearnContext, saveContinueLearning, continueLearning, setMascot, pushMascotToast } = useAppStore()
  const [data, setData] = useState<DashboardData | null>(initialData?.progress as DashboardData | null)
  const [revisionDue, setRevisionDue] = useState<any[]>(initialData?.revisionDue ?? [])
  const [tasks, setTasks] = useState<any[]>(initialData?.tasks ?? [])
  const [achievements, setAchievements] = useState<any[]>(initialData?.achievements ?? [])
  const [activity, setActivity] = useState<{ xpByDay: number[]; activeDays: string[]; minutesToday: number; dailyGoalMins: number } | null>(initialData?.activity ?? null)

  useEffect(() => {
    if (initialData) return

    Promise.all([
      fetch('/api/progress').then((r) => r.json()),
      fetch('/api/revision/due').then((r) => r.json()),
      fetch('/api/planner/task').then((r) => r.json()),
      fetch('/api/achievements').then((r) => r.json()),
      fetch('/api/analytics/activity').then((r) => r.json()),
    ]).then(([prog, rev, task, ach, act]) => {
      if (prog.ok) setData(prog.data)
      if (rev.ok) setRevisionDue(rev.data.dueToday || [])
      if (task.ok) setTasks(task.data || [])
      if (ach.ok) setAchievements(ach.data.earned || [])
      if (act.ok) setActivity(act.data)
    })
  }, [initialData])

  const completedLessons = data?.lessonCompletions?.filter((l) => l.completedAt) || []
  const masteryRecords = data?.mastery || []
  const weakTopics = masteryRecords.filter((m: any) => m.state === 'weak' || m.state === 'learning').slice(0, 3)
  const masteredCount = masteryRecords.filter((m: any) => m.state === 'mastered').length
  const todayTasks = tasks.filter((t) => t.scheduledDate === new Date().toISOString().slice(0, 10) || !t.scheduledDate).slice(0, 4)
  const examDate = user?.examDate ? new Date(user.examDate) : null
  const daysToExam = examDate ? Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const handleContinue = () => {
    if (continueLearning) {
      setLearnContext({
        subjectId: continueLearning.subjectId,
        unitNumber: continueLearning.unitNumber,
        topicId: continueLearning.topicId,
        lessonId: continueLearning.lessonId,
        mode: continueLearning.mode,
      })
      setView('learn')
    } else if (subjects.length > 0) {
      const firstSubject = subjects[0]
      if (firstSubject.units[0]?.topics[0]) {
        setLearnContext({
          subjectId: firstSubject.id,
          unitNumber: firstSubject.units[0].number,
          topicId: firstSubject.units[0].topics[0].id,
        })
        setView('learn')
      }
    }
  }

  const overallProgress = subjects.length > 0
    ? Math.round(subjects.reduce((acc: number, s: Subject) => {
        const subjectLessons = s.units.flatMap((u) => u.lessons ?? [])
        const completed = subjectLessons.filter((l) => completedLessons.some((cl) => cl.lessonId === l.id && cl.completedAt)).length
        return acc + (subjectLessons.length > 0 ? (completed / subjectLessons.length) * 100 : 0)
      }, 0) / subjects.length)
    : 0

  return (
    <div className="space-y-6">
      {/* Hero greeting */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent border border-primary/20 p-5 md:p-6 shadow-soft"
      >
        <div className="absolute inset-0 bg-grid opacity-30 pointer-events-none" />
        <div className="absolute -top-12 -right-12 h-40 w-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="shrink-0 rounded-2xl bg-card/60 backdrop-blur p-1.5 -ml-1">
            <Mascot mascot="leo" state="greeting" size={64} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl md:text-2xl font-bold">
                <span className="text-gradient">{greeting()}</span>
                <span className="text-foreground">, {user?.name?.split(' ')[0] || 'Student'}!</span>
              </h1>
              {(user?.streak || 0) > 0 && (
                <Badge className="bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/20 hover:bg-amber-500/20 gap-1">
                  <Flame className="h-3 w-3 flame-flicker" />
                  {user?.streak} day streak
                </Badge>
              )}
              <StreakFreezeWidget variant="compact" />
            </div>
            <p className="text-sm text-muted-foreground mt-1 max-w-lg">
              {continueLearning
                ? `Ready to continue ${continueLearning.subjectName} — ${continueLearning.topicTitle}?`
                : 'Welcome to your adaptive learning platform. Pick a subject to begin your journey.'}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <Button onClick={handleContinue} size="sm" className="gap-2 shadow-sm">
                <Play className="h-4 w-4" />
                {continueLearning ? 'Continue Learning' : 'Start Learning'}
              </Button>
              <Button onClick={() => setView('tutor')} variant="outline" size="sm" className="gap-2 bg-card/60 backdrop-blur">
                <Bot className="h-4 w-4" />
                Ask LEO
              </Button>
            </div>
          </div>
          {/* Stats */}
          <div className="hidden md:flex flex-col gap-2">
            <StatPill icon={<Flame className="h-4 w-4" />} value={user?.streak || 0} label="day streak" color="text-amber-500" />
            <StatPill icon={<Zap className="h-4 w-4" />} value={user?.xp || 0} label="XP" color="text-primary" />
            <StatPill icon={<Trophy className="h-4 w-4" />} value={achievements.length} label="badges" color="text-violet-500" />
          </div>
        </div>
      </motion.div>

      {/* Insights row: Weekly XP + Daily Goal Ring + Streak Heatmap */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Card className="card-lift">
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm flex items-center gap-2">
                <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center">
                  <Zap className="h-3.5 w-3.5 text-primary" />
                </div>
                XP This Week
              </CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {activity ? (
              <WeeklyXpChart xpByDay={activity.xpByDay} />
            ) : (
              <div className="h-24 rounded-md shimmer" />
            )}
          </CardContent>
        </Card>

        <Card className="card-lift">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-success/10 flex items-center justify-center">
                <Target className="h-3.5 w-3.5 text-success" />
              </div>
              Daily Goal
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              {activity ? (
                <DailyGoalRing
                  value={activity.minutesToday}
                  goal={activity.dailyGoalMins}
                  unit="min"
                  size={92}
                />
              ) : (
                <div className="h-24 w-24 rounded-full shimmer" />
              )}
              <div className="flex-1 space-y-1">
                <p className="text-xs text-muted-foreground">Study time today</p>
                <p className="text-2xl font-bold tabular-nums leading-none">
                  {activity?.minutesToday ?? 0}
                  <span className="text-sm text-muted-foreground font-normal ml-1">/ {activity?.dailyGoalMins ?? 60} min</span>
                </p>
                <p className="text-meta text-muted-foreground">
                  {activity && activity.minutesToday >= activity.dailyGoalMins
                    ? '🎉 Goal smashed! Keep the momentum.'
                    : activity && activity.minutesToday > 0
                      ? `${Math.max(0, activity.dailyGoalMins - activity.minutesToday)} min to go`
                      : 'Start a session to chip away'}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="card-lift lg:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm flex items-center gap-2">
              <div className="h-7 w-7 rounded-md bg-amber-500/10 flex items-center justify-center">
                <Flame className="h-3.5 w-3.5 text-amber-500" />
              </div>
              Activity Heatmap
            </CardTitle>
          </CardHeader>
          <CardContent>
            {activity ? (
              <StreakHeatmap activityDays={activity.activeDays} weeks={13} />
            ) : (
              <div className="h-24 rounded-md shimmer" />
            )}
          </CardContent>
        </Card>
      </div>

      {/* Priority row 1: Continue Learning + Revision Due + Daily Quests */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Continue Learning - dominant */}
        <Card className="lg:col-span-2 border-primary/20 bg-gradient-to-br from-card to-primary/5 card-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <BookOpen className="h-4 w-4 text-primary" />
                </div>
                <CardTitle className="text-base">Continue Learning</CardTitle>
              </div>
              <Badge variant="secondary" className="text-meta uppercase tracking-wider">Priority</Badge>
            </div>
          </CardHeader>
          <CardContent>
            {continueLearning ? (
              <div>
                <p className="text-sm font-medium">{continueLearning.subjectName}</p>
                <p className="text-xs text-muted-foreground mt-0.5">Unit {continueLearning.unitNumber} · {continueLearning.topicTitle}</p>
                <div className="mt-3 flex items-center gap-2">
                  <Progress value={overallProgress} className="h-1.5" />
                  <span className="text-xs text-muted-foreground shrink-0 tabular-nums">{overallProgress}%</span>
                </div>
                <Button onClick={handleContinue} size="sm" className="mt-3 gap-2 w-full">
                  Resume <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            ) : (
              <div className="text-center py-4">
                <p className="text-sm text-muted-foreground mb-3">No active session yet. Start your first lesson!</p>
                <Button onClick={handleContinue} size="sm" className="gap-2">
                  Browse Subjects <ArrowRight className="h-3.5 w-3.5" />
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Daily Quests (NEW — Phase 10) */}
        <DailyQuestsCard />
      </div>

      {/* Row 1.5: Revision Due + Today's Plan + Exam Countdown */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Revision Due */}
        <Card className={cn('card-lift', revisionDue.length > 0 && 'border-amber-500/30')}>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <RotateCw className="h-4 w-4 text-amber-500" />
                </div>
                <CardTitle className="text-base">Revision Due</CardTitle>
              </div>
              {revisionDue.length > 0 && <Badge className="bg-amber-500 text-white tabular-nums">{revisionDue.length}</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            {revisionDue.length > 0 ? (
              <ScrollArea className="h-24">
                <div className="space-y-1.5">
                  {revisionDue.slice(0, 3).map((r: any) => (
                    <div key={r.id} className="flex items-center gap-2 text-xs">
                      <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="truncate flex-1">{r.topic.title}</span>
                      <Badge variant="outline" className="text-meta font-mono">{r.topic.unit.subject.code}</Badge>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            ) : (
              <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                <CheckCircle2 className="h-4 w-4 text-success" />
                All caught up!
              </div>
            )}
            <Button onClick={() => setView('revision')} variant="outline" size="sm" className="mt-2 w-full text-xs">
              {revisionDue.length > 0 ? 'Start Revision' : 'View Schedule'}
            </Button>
          </CardContent>
        </Card>

        {/* Today's Plan */}
        <Card className="card-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <CalendarCheck className="h-4 w-4 text-blue-500" />
              </div>
              <CardTitle className="text-base">Today's Plan</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {todayTasks.length > 0 ? (
              <div className="space-y-1.5">
                {todayTasks.slice(0, 3).map((t) => (
                  <div key={t.id} className="flex items-center gap-2 text-xs">
                    <div className={cn('h-3 w-3 rounded-full border', t.completed ? 'bg-success border-success' : 'border-muted-foreground')} />
                    <span className={cn('truncate flex-1', t.completed && 'line-through text-muted-foreground')}>{t.title}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3">No tasks scheduled. Add one in the planner.</p>
            )}
            <Button onClick={() => setView('planner')} variant="ghost" size="sm" className="mt-2 w-full text-xs">View Planner</Button>
          </CardContent>
        </Card>

        {/* Exam Countdown */}
        <Card className="card-lift">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-red-500/10 flex items-center justify-center">
                <Clock className="h-4 w-4 text-red-500" />
              </div>
              <CardTitle className="text-base">Exam Countdown</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {daysToExam !== null ? (
              <div className="text-center py-1">
                <p className="text-3xl font-bold text-red-500">{daysToExam}</p>
                <p className="text-xs text-muted-foreground">days remaining</p>
                <p className="text-meta text-muted-foreground mt-1">{examDate?.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}</p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground py-3 text-center">Set your exam date in Profile</p>
            )}
            <Button onClick={() => setView('exams')} variant="ghost" size="sm" className="mt-1 w-full text-xs">Prepare for Exams</Button>
          </CardContent>
        </Card>
      </div>

      {/* Row 2: Weak Topic (full-width, polished) */}
      <Card className="card-lift border-orange-500/20">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-orange-500" />
              </div>
              <CardTitle className="text-base">Focus Areas</CardTitle>
            </div>
            {weakTopics.length > 0 && <Badge variant="outline" className="text-meta">{weakTopics.length} topics</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {weakTopics.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              {weakTopics.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => { setLearnContext({ subjectId: m.topic.unit.subject.id }); setView('practice') }}
                  className="text-left flex items-center gap-2 p-2.5 rounded-lg border border-border hover-soft focus-ring"
                >
                  <AlertCircle className="h-4 w-4 text-orange-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium truncate">{m.topic.title}</p>
                    <p className="text-meta text-muted-foreground font-mono">{m.topic.unit.subject.code} · Unit {m.topic.unit.number}</p>
                  </div>
                  <Badge variant="outline" className="text-meta capitalize">{m.state}</Badge>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground py-3">Practice more to identify focus areas.</p>
          )}
          <Button onClick={() => setView('practice')} variant="ghost" size="sm" className="mt-3 text-xs">Start Practicing <ArrowRight className="h-3 w-3 ml-1" /></Button>
        </CardContent>
      </Card>

      {/* Row 3: Subject Progress */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold">Subject Progress</h3>
          <Button onClick={() => setView('learn')} variant="ghost" size="sm" className="text-xs gap-1">
            All Subjects <ArrowRight className="h-3 w-3" />
          </Button>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {subjects.map((subject) => {
            const subjectLessons = subject.units.flatMap((u) => u.lessons ?? [])
            const completed = subjectLessons.filter((l) => completedLessons.some((cl) => cl.lessonId === l.id && cl.completedAt)).length
            const pct = subjectLessons.length > 0 ? Math.round((completed / subjectLessons.length) * 100) : 0
            const subjectMastery = masteryRecords.filter((m: any) => m.topic.unit.subject.id === subject.id)
            const avgMastery = subjectMastery.length > 0 ? Math.round(subjectMastery.reduce((a: number, m: any) => a + m.score, 0) / subjectMastery.length) : 0
            return (
              <SubjectCard key={subject.id} subject={subject} lessonPct={pct} masteryPct={avgMastery} onClick={() => {
                setLearnContext({ subjectId: subject.id })
                setView('learn')
              }} />
            )
          })}
        </div>
      </div>

      {/* Row 4: Quick Actions */}
      <div>
        <h3 className="text-sm font-semibold mb-3">Quick Actions</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3">
          <QuickAction icon={Bot} label="AI Tutor" color="text-violet-500" onClick={() => setView('tutor')} />
          <QuickAction icon={PenTool} label="Practice" color="text-cyan-500" onClick={() => setView('practice')} />
          <QuickAction icon={FlaskConical} label="Labs" color="text-emerald-500" onClick={() => setView('labs')} />
          <QuickAction icon={Code2} label="Coding" color="text-amber-500" onClick={() => setView('coding')} />
          <QuickAction icon={FileText} label="Mock Exam" color="text-rose-500" onClick={() => setView('exams')} />
          <QuickAction icon={Library} label="Materials" color="text-indigo-500" onClick={() => setView('materials')} />
        </div>
      </div>

      {/* Row 5: Achievements + Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <AchievementWall variant="compact" />

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-32">
              <div className="space-y-2">
                {(data?.questionAttempts || []).slice(0, 5).map((a: any) => (
                  <div key={a.id} className="flex items-center gap-2 text-xs">
                    {a.isCorrect ? <CheckCircle2 className="h-3 w-3 text-success" /> : <X className="h-3 w-3 text-destructive" />}
                    <span className="truncate flex-1 text-muted-foreground">Answered a question</span>
                    <span className="text-meta text-muted-foreground">{timeAgo(a.createdAt)}</span>
                  </div>
                ))}
                {completedLessons.slice(0, 3).map((l: any) => (
                  <div key={l.id} className="flex items-center gap-2 text-xs">
                    <BookOpen className="h-3 w-3 text-primary" />
                    <span className="truncate flex-1 text-muted-foreground">Completed: {l.lesson?.title || 'Lesson'}</span>
                    <span className="text-meta text-muted-foreground">{timeAgo(l.completedAt)}</span>
                  </div>
                ))}
                {(data?.questionAttempts || []).length === 0 && completedLessons.length === 0 && (
                  <p className="text-xs text-muted-foreground py-3 text-center">No activity yet. Start learning!</p>
                )}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function SubjectCard({ subject, lessonPct, masteryPct, onClick }: { subject: Subject; lessonPct: number; masteryPct: number; onClick: () => void }) {
  const mascot = subject.mascotKey || 'leo'
  return (
    <Card className="cursor-pointer card-lift group focus-ring" onClick={onClick} tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick() } }}
    >
      <CardContent className="p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="h-9 w-9 rounded-lg flex items-center justify-center transition-transform group-hover:scale-110" style={{ backgroundColor: `${subject.accentColor}15` }}>
            <Mascot mascot={mascot as any} state="idle" size={32} animated={false} />
          </div>
          <Badge variant="outline" className="text-meta font-mono">{subject.code}</Badge>
        </div>
        <p className="text-sm font-medium leading-tight line-clamp-2 min-h-[2.5rem]">{subject.name}</p>
        <div className="mt-3 space-y-1.5">
          <div className="flex justify-between text-meta text-muted-foreground">
            <span>Lessons</span>
            <span className="tabular-nums">{lessonPct}%</span>
          </div>
          <Progress value={lessonPct} className="h-1" style={{ '--progress-color': subject.accentColor } as any} />
          <div className="flex justify-between text-meta text-muted-foreground">
            <span>Mastery</span>
            <span className="tabular-nums">{masteryPct}%</span>
          </div>
          <Progress value={masteryPct} className="h-1" />
        </div>
      </CardContent>
    </Card>
  )
}

function QuickAction({ icon: Icon, label, color, onClick }: { icon: any; label: string; color: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-3 hover:shadow-soft hover:border-primary/30 transition-all group focus-ring"
    >
      <div className={cn('h-10 w-10 rounded-lg bg-muted flex items-center justify-center group-hover:scale-110 transition-transform', color)}>
        <Icon className="h-5 w-5" />
      </div>
      <span className="text-xs font-medium">{label}</span>
    </button>
  )
}

function StatPill({ icon, value, label, color }: { icon: React.ReactNode; value: number; label: string; color: string }) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-card border border-border px-3 py-1.5">
      <span className={color}>{icon}</span>
      <div>
        <p className="text-sm font-bold leading-none">{value}</p>
        <p className="text-meta text-muted-foreground">{label}</p>
      </div>
    </div>
  )
}

function greeting() {
  const h = new Date().getHours()
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  return 'Good evening'
}

function timeAgo(date: string) {
  const diff = Date.now() - new Date(date).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins}m ago`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `${hrs}h ago`
  return `${Math.floor(hrs / 24)}d ago`
}

function X({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
  )
}
