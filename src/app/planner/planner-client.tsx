'use client'

import { useState, useCallback } from 'react'
import { Plus, Trash2, Sparkles, Clock, BookOpen, CheckCircle2, Circle, Calendar, Target, TrendingUp, Loader2 } from 'lucide-react'

interface SubjectInfo {
  code: string
  name: string
  credits: number
  resources: number
  coverageFocus: string
}

interface Task {
  id: string
  title: string
  subject: string
  date: string
  priority: number
  completed: boolean
}

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday']
const DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

export function PlannerClient({ subjects }: { subjects: SubjectInfo[] }) {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try {
      const stored = localStorage.getItem('lernio-planner-tasks')
      return stored ? JSON.parse(stored) : []
    } catch { return [] }
  })
  const [showAdd, setShowAdd] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newSubject, setNewSubject] = useState(subjects[0]?.code ?? '')
  const [newDate, setNewDate] = useState(DAYS[0])
  const [newPriority, setNewPriority] = useState(2)
  const [generating, setGenerating] = useState(false)
  const [view, setView] = useState<'week' | 'list'>('week')

  const save = useCallback((updated: Task[]) => {
    setTasks(updated)
    try { localStorage.setItem('lernio-planner-tasks', JSON.stringify(updated)) } catch {}
  }, [])

  const addTask = () => {
    if (!newTitle.trim()) return
    const task: Task = {
      id: Date.now().toString(),
      title: newTitle,
      subject: newSubject,
      date: newDate,
      priority: newPriority,
      completed: false,
    }
    save([...tasks, task])
    setNewTitle('')
    setShowAdd(false)
  }

  const toggleTask = (id: string) => {
    save(tasks.map(t => t.id === id ? { ...t, completed: !t.completed } : t))
  }

  const deleteTask = (id: string) => {
    save(tasks.filter(t => t.id !== id))
  }

  const autoPlan = async () => {
    setGenerating(true)
    try {
      const response = await fetch('/api/planner/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          subjects: subjects.map(s => ({
            code: s.code, name: s.name, credits: s.credits, coverageFocus: s.coverageFocus,
          })),
        }),
      })
      const data = await response.json()
      if (data.ok && data.tasks) {
        save([...tasks, ...data.tasks])
      }
    } catch {
      // Fallback
    } finally {
      setGenerating(false)
    }
  }

  const subjectName = (code: string) => subjects.find(s => s.code === code)?.name ?? code
  const subjectColor = (code: string) => {
    const colors = ['#06B6D4', '#8B5CF6', '#F59E0B', '#10B981', '#EC4899', '#3B82F6', '#EF4444']
    const idx = subjects.findIndex(s => s.code === code)
    return colors[idx % colors.length] || '#06B6D4'
  }
  const priorityColor = (p: number) => p >= 4 ? '#EF4444' : p >= 3 ? '#F59E0B' : '#3B82F6'
  const priorityLabel = (p: number) => p >= 4 ? 'High' : p >= 3 ? 'Med' : 'Low'

  const completedCount = tasks.filter(t => t.completed).length
  const totalCount = tasks.length
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const tasksByDay = (day: string) => tasks.filter(t => t.date === day).sort((a, b) => b.priority - a.priority)

  return (
    <div className="space-y-4">
      {/* Stats bar */}
      <div className="grid grid-cols-3 gap-3">
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <Target className="h-4 w-4 text-primary" />
            <span className="text-xs font-semibold text-muted-foreground">Total Tasks</span>
          </div>
          <p className="text-2xl font-bold">{totalCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <CheckCircle2 className="h-4 w-4 text-green-500" />
            <span className="text-xs font-semibold text-muted-foreground">Completed</span>
          </div>
          <p className="text-2xl font-bold text-green-500">{completedCount}</p>
        </div>
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-1">
            <TrendingUp className="h-4 w-4 text-amber-500" />
            <span className="text-xs font-semibold text-muted-foreground">Progress</span>
          </div>
          <p className="text-2xl font-bold text-amber-700 dark:text-amber-300">{completionRate}%</p>
        </div>
      </div>

      {/* Action bar */}
      <div className="flex flex-wrap items-center gap-2">
        <button
          onClick={autoPlan}
          disabled={generating}
          className="flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-50"
        >
          {generating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          {generating ? 'AI Planning...' : 'AI Auto-Plan'}
        </button>
        <button
          onClick={() => setShowAdd(!showAdd)}
          className="flex items-center gap-1.5 rounded-lg border border-border px-4 py-2 text-sm font-medium hover:bg-accent transition-colors"
        >
          <Plus className="h-4 w-4" /> Add Task
        </button>
        <div className="ml-auto flex gap-1">
          <button
            onClick={() => setView('week')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${view === 'week' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            <Calendar className="h-3.5 w-3.5 inline mr-1" /> Week
          </button>
          <button
            onClick={() => setView('list')}
            className={`rounded-lg px-3 py-2 text-xs font-medium transition-colors ${view === 'list' ? 'bg-primary text-primary-foreground' : 'border border-border hover:bg-accent'}`}
          >
            List View
          </button>
        </div>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <input
            type="text"
            placeholder="Task title (e.g., Watch: Arrays lecture)"
            value={newTitle}
            onChange={e => setNewTitle(e.target.value)}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
            onKeyDown={e => e.key === 'Enter' && addTask()}
          />
          <div className="flex flex-wrap gap-2">
            <select
              value={newSubject}
              onChange={e => setNewSubject(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              {subjects.map(s => <option key={s.code} value={s.code}>{s.code} — {s.name}</option>)}
            </select>
            <select
              value={newDate}
              onChange={e => setNewDate(e.target.value)}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select
              value={newPriority}
              onChange={e => setNewPriority(Number(e.target.value))}
              className="rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none"
            >
              <option value={1}>Low</option>
              <option value={2}>Low-Medium</option>
              <option value={3}>Medium</option>
              <option value={4}>Medium-High</option>
              <option value={5}>High</option>
            </select>
            <button onClick={addTask} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">
              Add
            </button>
          </div>
        </div>
      )}

      {/* Week view */}
      {view === 'week' && (
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-7">
          {DAYS.map((day, dayIdx) => {
            const dayTasks = tasksByDay(day)
            return (
              <div key={day} className="rounded-xl border border-border bg-card p-3 min-h-[200px]">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-xs font-bold text-foreground">{DAY_SHORT[dayIdx]}</p>
                    <p className="text-[10px] text-muted-foreground">{dayTasks.length} tasks</p>
                  </div>
                  {dayTasks.length > 0 && (
                    <span className="text-[10px] font-bold rounded-full px-2 py-0.5" style={{ backgroundColor: `${priorityColor(Math.max(...dayTasks.map(t => t.priority)))}20`, color: priorityColor(Math.max(...dayTasks.map(t => t.priority))) }}>
                      {dayTasks.filter(t => !t.completed).length} left
                    </span>
                  )}
                </div>
                <div className="space-y-1.5">
                  {dayTasks.map(task => (
                    <div
                      key={task.id}
                      className={`rounded-lg border p-2 cursor-pointer transition-all ${task.completed ? 'opacity-50 border-border bg-muted/20' : 'border-border bg-background hover:border-primary/30'}`}
                      onClick={() => toggleTask(task.id)}
                    >
                      <div className="flex items-start gap-1.5">
                        {task.completed ? (
                          <CheckCircle2 className="h-3.5 w-3.5 text-green-500 shrink-0 mt-0.5" />
                        ) : (
                          <Circle className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        )}
                        <div className="min-w-0 flex-1">
                          <p className={`text-xs font-medium leading-tight ${task.completed ? 'line-through' : ''}`}>
                            {task.title}
                          </p>
                          <div className="flex items-center gap-1 mt-1">
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${subjectColor(task.subject)}20`, color: subjectColor(task.subject) }}
                            >
                              {task.subject}
                            </span>
                            <span
                              className="text-[9px] font-bold px-1.5 py-0.5 rounded"
                              style={{ backgroundColor: `${priorityColor(task.priority)}20`, color: priorityColor(task.priority) }}
                            >
                              {priorityLabel(task.priority)}
                            </span>
                          </div>
                        </div>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteTask(task.id) }}
                          className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {dayTasks.length === 0 && (
                    <p className="text-[10px] text-muted-foreground text-center py-4">No tasks</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* List view */}
      {view === 'list' && (
        <div className="space-y-2">
          {tasks.length === 0 ? (
            <div className="rounded-xl border border-border bg-card p-12 text-center">
              <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm text-muted-foreground">No tasks yet. Click "AI Auto-Plan" to generate a study plan.</p>
            </div>
          ) : (
            tasks.sort((a, b) => {
              if (a.completed !== b.completed) return a.completed ? 1 : -1
              return DAYS.indexOf(a.date) - DAYS.indexOf(b.date)
            }).map(task => (
              <div
                key={task.id}
                className={`flex items-center gap-3 rounded-lg border p-3 transition-all ${task.completed ? 'opacity-50 border-border bg-muted/20' : 'border-border bg-card hover:border-primary/30'}`}
              >
                <button onClick={() => toggleTask(task.id)} className="shrink-0">
                  {task.completed ? (
                    <CheckCircle2 className="h-5 w-5 text-green-500" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </button>
                <div className="min-w-0 flex-1">
                  <p className={`text-sm font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{task.date}</span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${subjectColor(task.subject)}20`, color: subjectColor(task.subject) }}
                    >
                      {subjectName(task.subject)}
                    </span>
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                      style={{ backgroundColor: `${priorityColor(task.priority)}20`, color: priorityColor(task.priority) }}
                    >
                      {priorityLabel(task.priority)}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => deleteTask(task.id)}
                  className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  )
}
