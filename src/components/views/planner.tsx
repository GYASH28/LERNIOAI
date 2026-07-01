'use client'

import Link from 'next/link'
import { useEffect, useState } from 'react'
import { useAppStore } from '@/store/app-store'
import { Mascot } from '@/components/mascots/mascot'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { ScrollArea } from '@/components/ui/scroll-area'
import {
  Plus, Clock, CheckCircle2, Circle, Trash2,
  Zap, BookOpen, PenTool, RotateCw, FlaskConical, Code2, FileText, Coffee, Loader2, ArrowUpRight,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'
import { toast } from 'sonner'

type TaskTypeIcon = typeof BookOpen
interface TypeConfigEntry { icon: TaskTypeIcon; color: string; label: string }

interface PlannerTask {
  id: string
  title: string
  type: string
  durationMins: number
  scheduledDate?: string | null
  priority: number
  completed: boolean
  canonicalUrl?: string | null
  sourceReason?: string | null
}

const TYPE_CONFIG: Record<string, TypeConfigEntry> = {
  learn: { icon: BookOpen, color: 'text-violet-500 bg-violet-500/10', label: 'Learn' },
  study: { icon: BookOpen, color: 'text-violet-500 bg-violet-500/10', label: 'Study' },
  practice: { icon: PenTool, color: 'text-cyan-500 bg-cyan-500/10', label: 'Practice' },
  revision: { icon: RotateCw, color: 'text-amber-500 bg-amber-500/10', label: 'Revision' },
  lab: { icon: FlaskConical, color: 'text-emerald-500 bg-emerald-500/10', label: 'Lab' },
  coding: { icon: Code2, color: 'text-orange-500 bg-orange-500/10', label: 'Coding' },
  mock_exam: { icon: FileText, color: 'text-rose-500 bg-rose-500/10', label: 'Mock Exam' },
  buffer: { icon: Coffee, color: 'text-gray-500 bg-gray-500/10', label: 'Buffer' },
  rest: { icon: Coffee, color: 'text-gray-500 bg-gray-500/10', label: 'Rest' },
}

export function PlannerView() {
  const { user, subjects, pushMascotToast } = useAppStore()
  const [tasks, setTasks] = useState<PlannerTask[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [regenDialogOpen, setRegenDialogOpen] = useState(false)

  const load = () => {
    fetch('/api/planner/task').then(r => r.json()).then(d => { setTasks(d.data || []); setLoading(false) })
  }
  useEffect(() => { load() }, [])

  const today = new Date().toISOString().slice(0, 10)
  const todayTasks = tasks.filter(t => !t.scheduledDate || t.scheduledDate === today)
  const completedToday = todayTasks.filter(t => t.completed).length
  const todayMins = todayTasks.reduce((sum, t) => sum + (t.durationMins || 0), 0)
  const examDate = user?.examDate ? new Date(user.examDate) : null
  const daysToExam = examDate ? Math.ceil((examDate.getTime() - Date.now()) / (1000 * 60 * 60 * 24)) : null

  const generatePlan = async (regenerate: boolean) => {
    setGenerating(true)
    try {
      const res = await fetch('/api/planner/auto', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ regenerate }),
      })
      const data = await res.json()
      if (data.ok) {
        const { created, skipped, days } = data.data
        toast.success(
          `Plan generated: ${created} task${created === 1 ? '' : 's'} across ${days} day${days === 1 ? '' : 's'}${skipped > 0 ? ` · ${skipped} skipped` : ''}.`,
        )
        pushMascotToast({
          mascot: 'leo',
          state: 'achievement',
          message: 'Study plan generated! Tailored to your exam date, weak topics, and revision schedule.',
        })
        load()
      } else {
        toast.error(data.error?.message || 'Could not generate plan.')
      }
    } catch {
      toast.error('Network error — please try again.')
    } finally {
      setGenerating(false)
      setRegenDialogOpen(false)
    }
  }

  const handleAutoGenerateClick = () => {
    if (generating) return
    // If the user already has future uncompleted tasks, ask before regenerating
    // (regenerate=true would delete them). Otherwise just append.
    const hasFutureUncompleted = tasks.some(
      (t) => t.scheduledDate && t.scheduledDate >= today && !t.completed,
    )
    if (hasFutureUncompleted) {
      setRegenDialogOpen(true)
    } else {
      void generatePlan(false)
    }
  }

  const toggleTask = async (task: PlannerTask) => {
    await fetch('/api/planner/task', {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ taskId: task.id, completed: !task.completed }),
    })
    load()
    if (!task.completed) {
      pushMascotToast({ mascot: 'leo', state: 'correct', message: `Task completed! +15 XP. Keep the momentum going!` })
    }
  }

  const deleteTask = async (taskId: string) => {
    await fetch(`/api/planner/task?taskId=${taskId}`, { method: 'DELETE' })
    load()
  }

  const weekDays = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(); d.setDate(d.getDate() + i); return d
  })

  return (
    <div className="space-y-6">
      {/* Header — premium hero */}
      <div className="flex items-center gap-3 p-4 rounded-2xl bg-gradient-to-br from-emerald-500/10 via-cyan-500/5 to-transparent border border-emerald-500/15 shadow-soft">
        <div className="h-12 w-12 rounded-xl bg-card/60 backdrop-blur flex items-center justify-center shrink-0">
          <Mascot mascot="leo" state="greeting" size={40} />
        </div>
        <div className="flex-1">
          <h2 className="text-lg font-bold">
            <span className="text-gradient">Study Planner</span>
          </h2>
          <p className="text-sm text-muted-foreground">{new Date().toLocaleDateString('en-IN', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
        </div>
        {daysToExam !== null && (
          <div className="text-center px-4 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20">
            <p className="text-2xl font-bold text-rose-500 tabular-nums leading-none">{daysToExam}</p>
            <p className="text-meta text-muted-foreground mt-0.5">days to exam</p>
          </div>
        )}
      </div>

      {/* Stats — premium tiles */}
      <div className="grid grid-cols-3 gap-3">
        <div className="stat-tile stat-tile-tint-primary p-3 text-center">
          <p className="text-xl font-bold text-primary tabular-nums leading-none">{completedToday}/{todayTasks.length}</p>
          <p className="text-meta text-muted-foreground mt-1">Tasks Today</p>
        </div>
        <div className="stat-tile stat-tile-tint-amber p-3 text-center">
          <p className="text-xl font-bold text-amber-500 tabular-nums leading-none">{Math.round(todayMins / 60 * 10) / 10}h</p>
          <p className="text-meta text-muted-foreground mt-1">Planned Today</p>
        </div>
        <div className="stat-tile stat-tile-tint-emerald p-3 text-center">
          <p className="text-xl font-bold text-emerald-500 tabular-nums leading-none">{tasks.filter((t) => t.completed).length}</p>
          <p className="text-meta text-muted-foreground mt-1">Total Done</p>
        </div>
      </div>

      <div className="flex gap-2">
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button className="gap-2 flex-1 shadow-soft" disabled={generating}>
              <Plus className="h-4 w-4" /> Add Task
            </Button>
          </DialogTrigger>
          <DialogContent>
            <AddTaskForm subjects={subjects} onSaved={() => { setDialogOpen(false); load() }} />
          </DialogContent>
        </Dialog>
        <Button
          variant="outline"
          className="gap-2 hover-soft"
          onClick={handleAutoGenerateClick}
          disabled={generating}
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Zap className="h-4 w-4" />}
          {generating ? 'Generating…' : 'Auto-Generate'}
        </Button>
      </div>

      <AlertDialog open={regenDialogOpen} onOpenChange={setRegenDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Regenerate study plan?</AlertDialogTitle>
            <AlertDialogDescription>
              This will delete all your future uncompleted tasks and create a fresh
              plan based on your exam date, weak topics, and revision schedule.
              Completed tasks are preserved. This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={generating}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => { void generatePlan(true) }}
              disabled={generating}
              className="gap-2"
            >
              {generating ? <><Loader2 className="h-4 w-4 animate-spin" /> Generating…</> : 'Regenerate Plan'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Tabs defaultValue="today">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="today">Today</TabsTrigger>
          <TabsTrigger value="week">Week</TabsTrigger>
          <TabsTrigger value="all">All Tasks</TabsTrigger>
        </TabsList>

        {/* TODAY */}
        <TabsContent value="today" className="space-y-3">
          <div className="flex items-center justify-between">
            <Progress
              value={todayTasks.length > 0 ? (completedToday / todayTasks.length) * 100 : 0}
              className="h-2 flex-1 mr-3"
            />
            <span className="text-xs text-muted-foreground tabular-nums">
              {completedToday}/{todayTasks.length} done
            </span>
          </div>
          {todayTasks.length > 0 ? (
            <div className="space-y-2">
              {todayTasks.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t)} onDelete={() => deleteTask(t.id)} />)}
            </div>
          ) : (
            <Card className="card-lift">
              <CardContent className="p-8 text-center">
                <Mascot mascot="leo" state="idle" size={56} className="mx-auto mascot-float" />
                <p className="text-sm text-muted-foreground mt-3">No tasks scheduled for today.</p>
                <p className="text-xs text-muted-foreground">Add a task or auto-generate a study plan.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* WEEK */}
        <TabsContent value="week">
          <div className="grid grid-cols-1 sm:grid-cols-7 gap-2">
            {weekDays.map((day) => {
              const dateStr = day.toISOString().slice(0, 10)
              const dayTasks = tasks.filter((t) => t.scheduledDate === dateStr)
              const isToday = dateStr === today
              return (
                <div
                  key={dateStr}
                  className={cn(
                    'rounded-lg border p-2 min-h-32 transition-colors',
                    isToday
                      ? 'border-primary bg-primary/5 shadow-soft'
                      : 'border-border hover-soft',
                  )}
                >
                  <p className="text-meta font-medium text-center mb-1">{day.toLocaleDateString('en-IN', { weekday: 'short' })}</p>
                  <p className={cn('text-xs font-bold text-center mb-2 tabular-nums', isToday && 'text-primary')}>{day.getDate()}</p>
                  <div className="space-y-1">
                    {dayTasks.slice(0, 3).map((t) => {
                      const cfg = TYPE_CONFIG[t.type] || TYPE_CONFIG.learn
                      const Icon = cfg.icon
                      return (
                        <div
                          key={t.id}
                          className={cn('rounded p-1 text-meta flex items-center gap-1', cfg.color)}
                          title={t.title}
                        >
                          <Icon className="h-2.5 w-2.5 shrink-0" />
                          <span className="truncate">{t.title}</span>
                        </div>
                      )
                    })}
                    {dayTasks.length > 3 && <p className="text-meta text-muted-foreground text-center">+{dayTasks.length - 3} more</p>}
                  </div>
                </div>
              )
            })}
          </div>
        </TabsContent>

        {/* ALL */}
        <TabsContent value="all">
          <ScrollArea className="h-96">
            <div className="space-y-2">
              {tasks.map((t) => <TaskItem key={t.id} task={t} onToggle={() => toggleTask(t)} onDelete={() => deleteTask(t.id)} />)}
              {tasks.length === 0 && <p className="text-sm text-muted-foreground text-center py-8">No tasks yet.</p>}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  )
}

function TaskItem({ task, onToggle, onDelete }: { task: PlannerTask; onToggle: () => void; onDelete: () => void }) {
  const cfg = TYPE_CONFIG[task.type] || TYPE_CONFIG.learn
  const Icon = cfg.icon
  return (
    <motion.div layout initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
      <Card className={cn('transition-opacity', task.completed && 'opacity-60')}>
        <CardContent className="p-3 flex items-center gap-3">
          <button onClick={onToggle} className="shrink-0">
            {task.completed ? <CheckCircle2 className="h-5 w-5 text-success" /> : <Circle className="h-5 w-5 text-muted-foreground" />}
          </button>
          <div className={cn('h-8 w-8 rounded-lg flex items-center justify-center shrink-0', cfg.color)}>
            <Icon className="h-4 w-4" />
          </div>
          <div className="flex-1 min-w-0">
            <p className={cn('text-sm font-medium truncate', task.completed && 'line-through')}>{task.title}</p>
            <div className="flex items-center gap-2 mt-0.5">
              <span className="text-meta text-muted-foreground flex items-center gap-0.5"><Clock className="h-2.5 w-2.5" />{task.durationMins}m</span>
              {task.scheduledDate && <span className="text-meta text-muted-foreground">{new Date(task.scheduledDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>}
              {task.priority >= 3 && <Badge variant="secondary" className="text-meta">Urgent</Badge>}
            </div>
            {task.sourceReason ? (
              <p className="mt-1 text-xs text-muted-foreground">{task.sourceReason}</p>
            ) : null}
          </div>
          {task.canonicalUrl ? (
            <Link
              href={task.canonicalUrl}
              className="inline-flex h-8 shrink-0 items-center justify-center gap-1 rounded-md border border-border px-2 text-xs font-medium hover:bg-muted"
            >
              Open
              <ArrowUpRight className="h-3 w-3" />
            </Link>
          ) : null}
          <Button variant="ghost" size="sm" onClick={onDelete} className="shrink-0 text-muted-foreground hover:text-destructive">
            <Trash2 className="h-3.5 w-3.5" />
          </Button>
        </CardContent>
      </Card>
    </motion.div>
  )
}

function AddTaskForm({ subjects, onSaved }: { subjects: any[]; onSaved: () => void }) {
  const [title, setTitle] = useState('')
  const [type, setType] = useState('learn')
  const [subjectId, setSubjectId] = useState('')
  const [duration, setDuration] = useState(30)
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10))
  const [priority, setPriority] = useState(2)

  const save = async () => {
    await fetch('/api/planner/task', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, type, subjectId: subjectId || undefined, durationMins: duration, scheduledDate: date, priority }),
    })
    onSaved()
  }

  return (
    <div className="space-y-3">
      <DialogHeader><DialogTitle>Add Study Task</DialogTitle></DialogHeader>
      <div>
        <Label className="text-xs">Title</Label>
        <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="e.g. Complete Array sorting lesson" className="mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label className="text-xs">Type</Label>
          <Select value={type} onValueChange={setType}>
            <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
            <SelectContent>
              {Object.entries(TYPE_CONFIG).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Subject</Label>
          <Select value={subjectId} onValueChange={setSubjectId}>
            <SelectTrigger className="mt-1"><SelectValue placeholder="Optional" /></SelectTrigger>
            <SelectContent>{subjects.map(s => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div>
          <Label className="text-xs">Duration (min)</Label>
          <Input type="number" value={duration} onChange={e => setDuration(parseInt(e.target.value) || 30)} className="mt-1" />
        </div>
        <div>
          <Label className="text-xs">Date</Label>
          <Input type="date" value={date} onChange={e => setDate(e.target.value)} className="mt-1" />
        </div>
      </div>
      <div>
        <Label className="text-xs">Priority</Label>
        <Select value={String(priority)} onValueChange={v => setPriority(parseInt(v))}>
          <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="1">Low</SelectItem>
            <SelectItem value="2">Medium</SelectItem>
            <SelectItem value="3">High</SelectItem>
            <SelectItem value="4">Urgent</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <Button onClick={save} disabled={!title} className="w-full">Add Task</Button>
    </div>
  )
}
