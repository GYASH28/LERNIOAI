'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Progress } from '@/components/ui/progress'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SubjectProgressTree } from '@/components/ui/subject-progress-tree'
import { FocusSessionsPanel } from '@/components/ui/focus-sessions-panel'
import { AchievementWall } from '@/components/ui/achievement-wall'
import { StudyCalendarHeatmap } from '@/components/ui/study-calendar-heatmap'
import { ExamReadinessWidget } from '@/components/ui/exam-readiness-widget'
import { SubjectReadinessRadar } from '@/components/ui/subject-readiness-radar'
import {
  Zap, Flame, Brain, Clock, TrendingUp, TrendingDown,
  Target, Award, Sparkles, ChevronRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { routeForView } from '@/lib/routes'
import {
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend, LineChart, Line, CartesianGrid,
} from 'recharts'

const STATE_COLORS: Record<string, string> = {
  new: '#94a3b8', learning: '#7c3aed', weak: '#ef4444',
  revising: '#f59e0b', proficient: '#10b981', mastered: '#22c55e',
}

export function AnalyticsView() {
  const router = useRouter()
  const { user, subjects, setLearnContext } = useAppStore()
  const [data, setData] = useState<any>(null)
  const goToPractice = () => router.push(routeForView('practice'))

  useEffect(() => {
    fetch('/api/progress').then((r) => r.json()).then((prog) => {
      if (prog.ok) setData(prog.data)
    })
  }, [])

  const mastery = data?.mastery || []
  const lessons = data?.lessonCompletions || []
  const quizAttempts = data?.quizAttempts || []
  const sessions = data?.studySessions || []

  const masteredCount = mastery.filter((m: any) => m.state === 'mastered').length
  const totalTopics = mastery.length
  const studyMins = sessions.reduce((sum: number, s: any) => sum + (s.durationMins || 0), 0)

  const subjectRadar = subjects.map((s) => {
    const sm = mastery.filter((m: any) => m.topic.unit.subject.id === s.id)
    const avg = sm.length > 0 ? Math.round(sm.reduce((a: number, m: any) => a + m.score, 0) / sm.length) : 0
    return { subject: s.shortName || s.code, mastery: avg }
  })

  const stateData = Object.keys(STATE_COLORS).map((state) => ({
    name: state, value: mastery.filter((m: any) => m.state === state).length, color: STATE_COLORS[state],
  })).filter((d) => d.value > 0)

  const scoreTrend = quizAttempts.slice(0, 10).reverse().map((q: any, i: number) => ({
    name: `Q${i + 1}`, score: q.maxScore > 0 ? Math.round((q.score / q.maxScore) * 100) : 0,
  }))

  const subjectProgress = subjects.map((s) => {
    const sl = s.units.flatMap((u) => u.lessons)
    const completed = sl.filter((l: any) => lessons.some((cl: any) => cl.lessonId === l.id && cl.completedAt)).length
    return { name: s.shortName || s.code, progress: sl.length > 0 ? Math.round((completed / sl.length) * 100) : 0 }
  })

  const weekData = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() - (6 - i))
    const dayStr = d.toDateString()
    const dayMins = sessions.filter((s: any) => new Date(s.startedAt).toDateString() === dayStr).reduce((a: number, s: any) => a + (s.durationMins || 0), 0)
    return { day: d.toLocaleDateString('en-IN', { weekday: 'short' }), minutes: dayMins }
  })

  const weakTopics = mastery.filter((m: any) => m.state === 'weak' || (m.state === 'learning' && m.score < 50)).sort((a: any, b: any) => a.score - b.score).slice(0, 5)

  return (
    <div className="space-y-6">
      {/* Header — gradient hero */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-primary/10 via-violet-500/5 to-transparent border border-primary/15 shadow-soft">
        <div className="h-12 w-12 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center shrink-0">
          <Mascot mascot="leo" state="explaining" size={40} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            <span className="text-gradient">Learning Analytics</span>
          </h2>
          <p className="text-sm text-muted-foreground">Your learning journey at a glance.</p>
        </div>
        <Badge className="hidden sm:flex gap-1.5 bg-primary/10 text-primary border-primary/20">
          <Sparkles className="h-3 w-3" /> {subjects.length} subjects
        </Badge>
      </div>

      {/* Stat Cards — premium tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <StatTile icon={<Zap className="h-4 w-4" />} value={user?.xp || 0} label="Total XP" sub={`Level ${user?.level || 1}`} tint="primary" />
        <StatTile icon={<Flame className="h-4 w-4" />} value={user?.streak || 0} label="Day Streak" sub="Keep it up!" tint="amber" />
        <StatTile icon={<Brain className="h-4 w-4" />} value={masteredCount} label="Topics Mastered" sub={`${totalTopics} total`} tint="emerald" />
        <StatTile icon={<Clock className="h-4 w-4" />} value={`${Math.round(studyMins / 60 * 10) / 10}h`} label="Study Time" sub="All time" tint="cyan" />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <ChartCard title="Subject Mastery" icon={<Target className="h-4 w-4 text-primary" />}>
          <div className="h-56">
            {subjectRadar.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={subjectRadar}>
                  <PolarGrid stroke="var(--border)" />
                  <PolarAngleAxis dataKey="subject" fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                  <PolarRadiusAxis domain={[0, 100]} fontSize={10} tick={{ fill: 'var(--muted-foreground)' }} />
                  <Radar dataKey="mastery" stroke="var(--primary)" fill="var(--primary)" fillOpacity={0.35} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', fontSize: '12px', color: 'var(--foreground)',
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Practice to see mastery" />}
          </div>
        </ChartCard>

        <ChartCard title="Topic Mastery Distribution" icon={<Brain className="h-4 w-4 text-primary" />}>
          <div className="h-56">
            {stateData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={stateData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={45} outerRadius={75} label={{ fontSize: 10 }}>
                    {stateData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Legend fontSize={10} wrapperStyle={{ fontSize: '10px' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', fontSize: '12px', color: 'var(--foreground)',
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Start learning to see distribution" />}
          </div>
        </ChartCard>

        <ChartCard title="Weekly Study Activity" icon={<TrendingUp className="h-4 w-4 text-primary" />}>
          <div className="h-56">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weekData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                <XAxis dataKey="day" fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                <YAxis fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                <Tooltip
                  contentStyle={{
                    background: 'var(--card)', border: '1px solid var(--border)',
                    borderRadius: '0.5rem', fontSize: '12px', color: 'var(--foreground)',
                  }}
                />
                <Bar dataKey="minutes" fill="var(--primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartCard>

        <ChartCard title="Quiz Score Trend" icon={<Award className="h-4 w-4 text-primary" />}>
          <div className="h-56">
            {scoreTrend.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={scoreTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
                  <XAxis dataKey="name" fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                  <YAxis domain={[0, 100]} fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--card)', border: '1px solid var(--border)',
                      borderRadius: '0.5rem', fontSize: '12px', color: 'var(--foreground)',
                    }}
                  />
                  <Line type="monotone" dataKey="score" stroke="var(--primary)" strokeWidth={2.5} dot={{ fill: 'var(--primary)', r: 3 }} activeDot={{ r: 5 }} />
                </LineChart>
              </ResponsiveContainer>
            ) : <EmptyChart text="Take quizzes to see trend" />}
          </div>
        </ChartCard>
      </div>

      {/* Subject Progress — horizontal bar */}
      <ChartCard title="Subject Progress" icon={<TrendingUp className="h-4 w-4 text-primary" />}>
        <div className="h-48">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={subjectProgress} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" opacity={0.5} />
              <XAxis type="number" domain={[0, 100]} fontSize={11} tick={{ fill: 'var(--muted-foreground)' }} />
              <YAxis type="category" dataKey="name" fontSize={11} width={50} tick={{ fill: 'var(--muted-foreground)' }} />
              <Tooltip
                contentStyle={{
                  background: 'var(--card)', border: '1px solid var(--border)',
                  borderRadius: '0.5rem', fontSize: '12px', color: 'var(--foreground)',
                }}
              />
              <Bar dataKey="progress" fill="var(--primary)" radius={[0, 6, 6, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </ChartCard>

      {/* NEW — Subject Progress Tree (Phase 10) */}
      <SubjectProgressTree
        subjects={subjects}
        mastery={mastery}
        lessons={lessons}
        onPractice={(subjectId) => {
          setLearnContext({ subjectId })
          goToPractice()
        }}
      />

      {/* NEW — Focus Sessions panel (Phase 11) */}
      <FocusSessionsPanel />

      {/* Weak Areas */}
      <Card className="card-lift border-rose-500/20">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="h-8 w-8 rounded-lg bg-rose-500/10 flex items-center justify-center">
                <TrendingDown className="h-4 w-4 text-rose-500" />
              </div>
              <CardTitle className="text-base">Focus Areas</CardTitle>
            </div>
            {weakTopics.length > 0 && <Badge variant="outline" className="text-meta">{weakTopics.length} topics</Badge>}
          </div>
        </CardHeader>
        <CardContent>
          {weakTopics.length > 0 ? (
            <div className="space-y-2">
              {weakTopics.map((m: any) => (
                <button
                  key={m.id}
                  onClick={() => { setLearnContext({ subjectId: m.topic.unit.subject.id }); goToPractice() }}
                  className="w-full flex min-h-[44px] items-center gap-2 sm:gap-3 p-2.5 rounded-lg border border-border hover-soft text-left focus-ring"
                >
                  <div className="h-9 w-9 rounded-lg bg-rose-500/10 flex items-center justify-center shrink-0">
                    <Target className="h-4 w-4 text-rose-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{m.topic.title}</p>
                    <p className="text-meta text-muted-foreground font-mono truncate">{m.topic.unit.subject.code} · {m.state}</p>
                  </div>
                  <div className="w-16 sm:w-24 shrink-0"><Progress value={m.score} className="h-1.5" /></div>
                  <span className="text-xs font-medium w-8 text-right tabular-nums shrink-0">{Math.round(m.score)}%</span>
                  <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />
                </button>
              ))}
            </div>
          ) : (
            <div className="text-center py-6">
              <Mascot mascot="leo" state="achievement" size={48} className="mx-auto" />
              <p className="text-sm text-muted-foreground mt-2">No weak areas identified.</p>
              <p className="text-xs text-muted-foreground">Practice more to track your progress!</p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Subject Readiness Radar — NEW Phase 13 (overlay all subjects) */}
      <SubjectReadinessRadar />

      {/* AI Exam Readiness Predictor — single-subject deep dive (Phase 12) */}
      <ExamReadinessWidget />

      {/* Study Calendar Heatmap — NEW Phase 12 (year-at-a-glance) */}
      <StudyCalendarHeatmap />

      {/* Achievement Wall — premium variant with category filter (replaces basic grid) */}
      <AchievementWall variant="full" />
    </div>
  )
}

function ChartCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <Card className="card-lift">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm flex items-center gap-2">
          <div className="h-7 w-7 rounded-md bg-primary/10 flex items-center justify-center text-primary">
            {icon}
          </div>
          {title}
        </CardTitle>
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}

function StatTile({
  icon, value, label, sub, tint,
}: {
  icon: React.ReactNode
  value: string | number
  label: string
  sub: string
  tint: 'primary' | 'amber' | 'emerald' | 'cyan' | 'rose'
}) {
  const tintClasses: Record<typeof tint, string> = {
    primary: 'stat-tile-tint-primary text-primary',
    amber: 'stat-tile-tint-amber text-amber-500',
    emerald: 'stat-tile-tint-emerald text-emerald-500',
    cyan: 'stat-tile-tint-cyan text-cyan-500',
    rose: 'stat-tile-tint-rose text-rose-500',
  }
  return (
    <div className={cn('stat-tile p-3', tintClasses[tint])}>
      <div className="flex items-center justify-between mb-1.5">
        <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center',
          tint === 'primary' && 'bg-primary/10',
          tint === 'amber' && 'bg-amber-500/10',
          tint === 'emerald' && 'bg-emerald-500/10',
          tint === 'cyan' && 'bg-cyan-500/10',
          tint === 'rose' && 'bg-rose-500/10',
        )}>
          {icon}
        </div>
      </div>
      <p className="text-xl font-bold leading-none tabular-nums">{value}</p>
      <p className="text-meta text-muted-foreground mt-1">{label}</p>
      <p className="text-meta text-muted-foreground/70">{sub}</p>
    </div>
  )
}

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex flex-col items-center justify-center text-muted-foreground">
      <Mascot mascot="leo" state="idle" size={40} animated={false} />
      <p className="text-xs mt-2">{text}</p>
    </div>
  )
}
