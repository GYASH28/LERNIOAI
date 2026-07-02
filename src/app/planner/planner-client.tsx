'use client'

import { useState, useCallback } from 'react'
import { Calendar, Plus, Trash2, Sparkles, Clock, BookOpen, CheckCircle2, Circle } from 'lucide-react'

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

  const autoPlan = () => {
    const plan: Task[] = []
    const weakSubjects = subjects.filter(s => s.credits >= 5).slice(0, 5)
    weakSubjects.forEach((s, i) => {
      const day = DAYS[i % 7]
      plan.push({
        id: `auto-${Date.now()}-${i}`,
        title: `Study: ${s.name} — watch primary lecture`,
        subject: s.code,
        date: day,
        priority: s.credits >= 5 ? 4 : 2,
        completed: false,
      })
      plan.push({
        id: `auto-${Date.now()}-${i}-quiz`,
        title: `Practice quiz: ${s.name}`,
        subject: s.code,
        date: DAYS[(i + 3) % 7],
        priority: 3,
        completed: false,
      })
    })
    save([...tasks, ...plan])
  }

  const subjectName = (code: string) => subjects.find(s => s.code === code)?.name ?? code
  const priorityColor = (p: number) => p >= 4 ? 'text-red-600' : p >= 3 ? 'text-amber-600' : 'text-blue-600'
  const priorityLabel = (p: number) => p >= 4 ? 'High' : p >= 3 ? 'Medium' : 'Low'

  return (
    <div>
      {/* Actions */}
      <div className="mb-4 flex flex-wrap gap-2">
        <button onClick={autoPlan} className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90 transition-colors">
          <Sparkles className="h-4 w-4" /> Auto-Plan Week
        </button>
        <button onClick={() => setShowAdd(!showAdd)} className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-sm font-medium hover:bg-accent transition-colors">
          <Plus className="h-4 w-4" /> Add Task
        </button>
      </div>

      {/* Add task form */}
      {showAdd && (
        <div className="mb-4 rounded-lg border border-border bg-card p-4 space-y-3">
          <input type="text" value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Task title (e.g., Watch Arrays lecture)" className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          <div className="grid gap-2 sm:grid-cols-3">
            <select value={newSubject} onChange={e => setNewSubject(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
              {subjects.map(s => <option key={s.code} value={s.code}>{s.name}</option>)}
            </select>
            <select value={newDate} onChange={e => setNewDate(e.target.value)} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
              {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
            </select>
            <select value={newPriority} onChange={e => setNewPriority(Number(e.target.value))} className="rounded-md border border-border bg-background px-3 py-2 text-sm outline-none">
              <option value={1}>Low Priority</option>
              <option value={2}>Medium Priority</option>
              <option value={3}>High Priority</option>
              <option value={4}>Critical</option>
            </select>
          </div>
          <button onClick={addTask} className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90">Add Task</button>
        </div>
      )}

      {/* Week grid */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-7">
        {DAYS.map(day => {
          const dayTasks = tasks.filter(t => t.date === day)
          return (
            <div key={day} className="rounded-lg border border-border bg-card p-3 min-h-[120px]">
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{day.slice(0, 3)}</h3>
                <span className="text-[10px] text-muted-foreground">{dayTasks.length}</span>
              </div>
              <div className="space-y-2">
                {dayTasks.map(task => (
                  <div key={task.id} className={`rounded-md border p-2 transition-colors ${task.completed ? 'border-green-500/30 bg-green-500/5 opacity-60' : 'border-border bg-background'}`}>
                    <div className="flex items-start gap-1.5">
                      <button onClick={() => toggleTask(task.id)} className="mt-0.5 shrink-0">
                        {task.completed ? <CheckCircle2 className="h-3.5 w-3.5 text-green-600" /> : <Circle className="h-3.5 w-3.5 text-muted-foreground" />}
                      </button>
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-medium ${task.completed ? 'line-through' : ''}`}>{task.title}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{subjectName(task.subject)}</p>
                        <span className={`text-[9px] font-bold ${priorityColor(task.priority)}`}>{priorityLabel(task.priority)}</span>
                      </div>
                      <button onClick={() => deleteTask(task.id)} className="shrink-0 text-muted-foreground hover:text-red-600">
                        <Trash2 className="h-3 w-3" />
                      </button>
                    </div>
                  </div>
                ))}
                {dayTasks.length === 0 && <p className="text-[10px] text-muted-foreground/50 text-center py-2">No tasks</p>}
              </div>
            </div>
          )
        })}
      </div>

      {/* Summary */}
      <div className="mt-4 flex items-center justify-between rounded-lg border border-border bg-card p-3">
        <div className="flex items-center gap-4 text-sm">
          <span className="flex items-center gap-1"><CheckCircle2 className="h-4 w-4 text-green-600" />{tasks.filter(t => t.completed).length} done</span>
          <span className="flex items-center gap-1"><Circle className="h-4 w-4 text-muted-foreground" />{tasks.filter(t => !t.completed).length} pending</span>
          <span className="flex items-center gap-1"><BookOpen className="h-4 w-4 text-primary" />{subjects.length} subjects</span>
        </div>
      </div>
    </div>
  )
}
