'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  CheckCircle2, XCircle, Clock, FileText, Users, Calendar,
  TrendingUp, ChevronRight, Loader2, ClipboardList, Award, ArrowLeft, Download
} from 'lucide-react'

interface Student {
  id: string
  name: string
  rollNumber: string | null
  email: string
}

interface AttendanceRecord {
  id: string
  status: string
  remark: string | null
  date: string
  subjectName: string | null
  subjectCode: string | null
}

interface SessionSummary {
  id: string
  date: string
  subjectCode: string | null
  subjectName: string | null
  totalStudents: number
  presentCount: number
  absentCount: number
  takenBy: { name: string } | null
}

type Status = 'present' | 'absent' | 'late' | 'excused'
type View = 'dashboard' | 'take' | 'history' | 'my-attendance' | 'session-detail'

export function AttendanceClient({
  canTakeAttendance,
  userClass,
}: {
  canTakeAttendance: boolean
  userClass: { departmentCode: string; semesterNumber: number; division: string }
}) {
  const [view, setView] = useState<View>('dashboard')
  const [loading, setLoading] = useState(false)
  const [students, setStudents] = useState<Student[]>([])
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [myRecords, setMyRecords] = useState<AttendanceRecord[]>([])
  const [myStats, setMyStats] = useState({ total: 0, present: 0, absent: 0, late: 0, percentage: 0 })
  const [classStats, setClassStats] = useState({ totalSessions: 0, totalPresent: 0, totalAbsent: 0, avgAttendance: 0 })
  const [sessionDetail, setSessionDetail] = useState<any>(null)
  const [marking, setMarking] = useState<Record<string, Status>>({})
  const [subjectName, setSubjectName] = useState('')
  const [subjectCode, setSubjectCode] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const fetchClassStudents = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance?action=class-students')
      const data = await res.json()
      if (data.ok) {
        setStudents(data.data)
        // Default everyone to present
        const defaults: Record<string, Status> = {}
        data.data.forEach((s: Student) => { defaults[s.id] = 'present' })
        setMarking(defaults)
      }
    } catch {}
    setLoading(false)
  }, [])

  const fetchSessions = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance?action=list-sessions')
      const data = await res.json()
      if (data.ok) setSessions(data.data)
    } catch {}
    setLoading(false)
  }, [])

  const fetchMyAttendance = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/attendance?action=my-attendance')
      const data = await res.json()
      if (data.ok) {
        setMyRecords(data.data.records)
        setMyStats(data.data.stats)
      }
    } catch {}
    setLoading(false)
  }, [])

  const fetchClassStats = useCallback(async () => {
    try {
      const res = await fetch('/api/attendance?action=stats')
      const data = await res.json()
      if (data.ok) setClassStats(data.data)
    } catch {}
  }, [])

  const fetchSessionDetail = useCallback(async (id: string) => {
    setLoading(true)
    try {
      const res = await fetch(`/api/attendance?action=session&id=${id}`)
      const data = await res.json()
      if (data.ok) setSessionDetail(data.data)
    } catch {}
    setLoading(false)
  }, [])

  useEffect(() => {
    fetchClassStats()
  }, [fetchClassStats])

  const submitAttendance = async () => {
    setLoading(true)
    setError('')
    setSuccess('')
    try {
      const records = Object.entries(marking).map(([userId, status]) => ({ userId, status }))
      const res = await fetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subjectCode, subjectName, records, notes }),
      })
      const data = await res.json()
      if (data.ok) {
        setSuccess('Attendance saved successfully!')
        setView('dashboard')
        fetchClassStats()
        fetchSessions()
      } else {
        setError(data.error || 'Failed to save attendance')
      }
    } catch {
      setError('Failed to save attendance')
    }
    setLoading(false)
  }

  const setStatus = (userId: string, status: Status) => {
    setMarking(prev => ({ ...prev, [userId]: status }))
  }

  const markAll = (status: Status) => {
    const all: Record<string, Status> = {}
    students.forEach(s => { all[s.id] = status })
    setMarking(all)
  }

  const presentCount = Object.values(marking).filter(s => s === 'present').length
  const absentCount = Object.values(marking).filter(s => s === 'absent').length

  const formatDate = (d: string) => new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })

  // ════════ DASHBOARD ════════
  if (view === 'dashboard') {
    return (
      <div className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {canTakeAttendance ? (
            <>
              <StatCard icon={ClipboardList} label="Sessions" value={classStats.totalSessions} color="text-cyan-500" />
              <StatCard icon={CheckCircle2} label="Total Present" value={classStats.totalPresent} color="text-green-500" />
              <StatCard icon={XCircle} label="Total Absent" value={classStats.totalAbsent} color="text-red-500" />
              <StatCard icon={TrendingUp} label="Avg Attendance" value={`${classStats.avgAttendance}%`} color="text-amber-500" />
            </>
          ) : (
            <>
              <StatCard icon={ClipboardList} label="Total Classes" value={myStats.total} color="text-cyan-500" />
              <StatCard icon={CheckCircle2} label="Present" value={myStats.present} color="text-green-500" />
              <StatCard icon={XCircle} label="Absent" value={myStats.absent} color="text-red-500" />
              <StatCard icon={Award} label="Attendance %" value={`${myStats.percentage}%`} color="text-amber-500" />
            </>
          )}
        </div>

        {/* Actions */}
        <div className="grid gap-3 sm:grid-cols-2">
          {canTakeAttendance && (
            <button
              onClick={() => { setView('take'); fetchClassStudents() }}
              className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <ClipboardList className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h3 className="text-sm font-bold">Take Attendance</h3>
                <p className="text-xs text-muted-foreground">Mark present/absent for today's class</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
            </button>
          )}

          <button
            onClick={() => { canTakeAttendance ? (setView('history'), fetchSessions()) : (setView('my-attendance'), fetchMyAttendance()) }}
            className="flex items-center gap-3 rounded-xl border border-border bg-card p-4 text-left transition-all hover:border-primary/40 hover:shadow-lg hover:-translate-y-0.5"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-violet-500/10">
              <Calendar className="h-5 w-5 text-violet-500" />
            </div>
            <div>
              <h3 className="text-sm font-bold">{canTakeAttendance ? 'Session History' : 'My Attendance'}</h3>
              <p className="text-xs text-muted-foreground">{canTakeAttendance ? 'View past sessions' : 'View your attendance records'}</p>
            </div>
            <ChevronRight className="ml-auto h-4 w-4 text-muted-foreground" />
          </button>
        </div>

        {/* Recent sessions (for CR/teacher) */}
        {canTakeAttendance && classStats.totalSessions > 0 && (
          <div>
            <h3 className="mb-2 text-sm font-semibold uppercase text-muted-foreground">Recent Sessions</h3>
            <div className="space-y-2">
              {sessions.slice(0, 3).map(s => (
                <button
                  key={s.id}
                  onClick={() => { setView('session-detail'); fetchSessionDetail(s.id) }}
                  className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/5"
                >
                  <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium">{s.subjectName || 'General'}</p>
                    <p className="text-xs text-muted-foreground">{formatDate(s.date)} · by {s.takenBy?.name || 'Unknown'}</p>
                  </div>
                  <div className="flex gap-2 text-xs">
                    <span className="rounded bg-green-500/10 px-2 py-0.5 font-bold text-green-500">{s.presentCount} P</span>
                    <span className="rounded bg-red-500/10 px-2 py-0.5 font-bold text-red-500">{s.absentCount} A</span>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
    )
  }

  // ════════ TAKE ATTENDANCE ════════
  if (view === 'take') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('dashboard')} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </button>

        <div className="rounded-xl border border-border bg-card p-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Subject Code (optional)</label>
              <input value={subjectCode} onChange={e => setSubjectCode(e.target.value)} placeholder="e.g. R23CP2402"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
            <div>
              <label className="text-xs font-semibold text-muted-foreground">Subject Name (optional)</label>
              <input value={subjectName} onChange={e => setSubjectName(e.target.value)} placeholder="e.g. Data Structures"
                className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-muted-foreground">Notes (optional)</label>
            <input value={notes} onChange={e => setNotes(e.target.value)} placeholder="e.g. Unit 3 lecture"
              className="mt-1 w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary" />
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex gap-2">
            <button onClick={() => markAll('present')} className="rounded-lg bg-green-500/10 px-3 py-1.5 text-xs font-medium text-green-500 hover:bg-green-500/20">
              All Present
            </button>
            <button onClick={() => markAll('absent')} className="rounded-lg bg-red-500/10 px-3 py-1.5 text-xs font-medium text-red-500 hover:bg-red-500/20">
              All Absent
            </button>
          </div>
          <div className="flex gap-3 text-xs">
            <span className="text-green-500 font-bold">{presentCount} Present</span>
            <span className="text-red-500 font-bold">{absentCount} Absent</span>
            <span className="text-muted-foreground">{students.length} Total</span>
          </div>
        </div>

        {/* Student list */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {students.map((student, i) => {
              const status = marking[student.id] || 'present'
              return (
                <div key={student.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">{i + 1}</span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{student.name}</p>
                    <p className="text-xs text-muted-foreground">{student.rollNumber || student.email}</p>
                  </div>
                  <div className="flex gap-1">
                    <button onClick={() => setStatus(student.id, 'present')}
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${status === 'present' ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground hover:bg-green-500/20'}`}>
                      <CheckCircle2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => setStatus(student.id, 'absent')}
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${status === 'absent' ? 'bg-red-500 text-white' : 'bg-muted text-muted-foreground hover:bg-red-500/20'}`}>
                      <XCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => setStatus(student.id, 'late')}
                      className={`flex h-8 w-8 items-center justify-center rounded-md transition-colors ${status === 'late' ? 'bg-amber-500 text-white' : 'bg-muted text-muted-foreground hover:bg-amber-500/20'}`}>
                      <Clock className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* Submit */}
        {error && <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-500">{error}</div>}
        {success && <div className="rounded-lg border border-green-500/30 bg-green-500/10 p-3 text-sm text-green-500">{success}</div>}
        <button
          onClick={submitAttendance}
          disabled={loading || students.length === 0}
          className="w-full rounded-lg bg-primary py-3 text-sm font-bold text-primary-foreground transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin inline mr-2" /> : null}
          Save Attendance ({presentCount} present, {absentCount} absent)
        </button>
      </div>
    )
  }

  // ════════ HISTORY (CR/teacher) ════════
  if (view === 'history') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('dashboard')} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </button>
        <h3 className="text-sm font-semibold uppercase text-muted-foreground">Session History</h3>
        {sessions.length > 0 && (
          <button onClick={() => exportAllSessionsCSV(sessions)} className="flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors">
            <Download className="h-3.5 w-3.5" /> Export All (CSV)
          </button>
        )}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : sessions.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance sessions yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {sessions.map(s => (
              <button key={s.id} onClick={() => { setView('session-detail'); fetchSessionDetail(s.id) }}
                className="flex w-full items-center gap-3 rounded-lg border border-border bg-card p-3 text-left transition-colors hover:bg-accent/5">
                <Calendar className="h-4 w-4 text-muted-foreground shrink-0" />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{s.subjectName || 'General Class'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(s.date)} · by {s.takenBy?.name || 'Unknown'}</p>
                </div>
                <div className="flex gap-2 text-xs">
                  <span className="rounded bg-green-500/10 px-2 py-0.5 font-bold text-green-500">{s.presentCount}P</span>
                  <span className="rounded bg-red-500/10 px-2 py-0.5 font-bold text-red-500">{s.absentCount}A</span>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ════════ MY ATTENDANCE (student) ════════
  if (view === 'my-attendance') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('dashboard')} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back
        </button>

        {/* Attendance percentage circle */}
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <div className="relative inline-flex h-32 w-32 items-center justify-center">
            <svg className="absolute inset-0 -rotate-90" viewBox="0 0 128 128">
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" className="text-muted/20" />
              <circle cx="64" cy="64" r="56" fill="none" stroke="currentColor" strokeWidth="8" strokeLinecap="round"
                className={myStats.percentage >= 75 ? 'text-green-500' : 'text-red-500'}
                strokeDasharray={`${2 * Math.PI * 56 * (myStats.percentage / 100)} ${2 * Math.PI * 56}`}
              />
            </svg>
            <div className="text-center">
              <p className="text-2xl font-bold">{myStats.percentage}%</p>
              <p className="text-[10px] text-muted-foreground">Attendance</p>
            </div>
          </div>
          <div className="mt-3 flex justify-center gap-4 text-xs">
            <span className="text-green-500 font-medium">{myStats.present} Present</span>
            <span className="text-red-500 font-medium">{myStats.absent} Absent</span>
            <span className="text-amber-500 font-medium">{myStats.late} Late</span>
          </div>
        </div>

        {/* Records */}
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : myRecords.length === 0 ? (
          <div className="rounded-xl border border-border bg-card p-8 text-center">
            <Calendar className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No attendance records yet.</p>
          </div>
        ) : (
          <div className="space-y-2">
            {myRecords.map(r => (
              <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                {r.status === 'present' ? <CheckCircle2 className="h-5 w-5 text-green-500 shrink-0" /> :
                 r.status === 'absent' ? <XCircle className="h-5 w-5 text-red-500 shrink-0" /> :
                 <Clock className="h-5 w-5 text-amber-500 shrink-0" />}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium">{r.subjectName || 'General Class'}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(r.date)}</p>
                </div>
                <span className={`text-xs font-bold uppercase rounded px-2 py-0.5 ${
                  r.status === 'present' ? 'bg-green-500/10 text-green-500' :
                  r.status === 'absent' ? 'bg-red-500/10 text-red-500' :
                  'bg-amber-500/10 text-amber-500'
                }`}>{r.status}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ════════ SESSION DETAIL ════════
  if (view === 'session-detail') {
    return (
      <div className="space-y-4">
        <button onClick={() => setView('history')} className="text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4 inline mr-1" /> Back to History
        </button>
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : sessionDetail ? (
          <>
            <div className="rounded-xl border border-border bg-card p-4">
              <h3 className="text-base font-bold">{sessionDetail.subjectName || 'General Class'}</h3>
              <p className="text-sm text-muted-foreground">{formatDate(sessionDetail.date)} · by {sessionDetail.takenBy?.name || 'Unknown'}</p>
              {sessionDetail.notes && <p className="mt-2 text-xs text-muted-foreground italic">{sessionDetail.notes}</p>}
              <div className="mt-3 flex gap-3 text-sm">
                <span className="text-green-500 font-bold">{sessionDetail.presentCount} Present</span>
                <span className="text-red-500 font-bold">{sessionDetail.absentCount} Absent</span>
                <span className="text-muted-foreground">{sessionDetail.totalStudents} Total</span>
              </div>
              <button
                onClick={() => exportSessionCSV(sessionDetail)}
                className="mt-3 flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-medium hover:bg-accent/50 transition-colors"
              >
                <Download className="h-3.5 w-3.5" /> Export This Session (CSV)
              </button>
            </div>
            <div className="space-y-2">
              {sessionDetail.records?.map((r: any) => (
                <div key={r.id} className="flex items-center gap-3 rounded-lg border border-border bg-card p-3">
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-bold">
                    {r.user?.name?.charAt(0).toUpperCase() || '?'}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{r.user?.name}</p>
                    <p className="text-xs text-muted-foreground">{r.user?.rollNumber || r.user?.email}</p>
                  </div>
                  <span className={`text-xs font-bold uppercase rounded px-2 py-0.5 ${
                    r.status === 'present' ? 'bg-green-500/10 text-green-500' :
                    r.status === 'absent' ? 'bg-red-500/10 text-red-500' :
                    'bg-amber-500/10 text-amber-500'
                  }`}>{r.status}</span>
                </div>
              ))}
            </div>
          </>
        ) : (
          <p className="text-sm text-muted-foreground text-center py-8">Session not found</p>
        )}
      </div>
    )
  }

  return null
}

// ─── CSV Export ───
function exportSessionCSV(session: any) {
  const headers = ['Roll No', 'Name', 'Email', 'Status', 'Remark']
  const rows = session.records?.map((r: any) => [
    r.user?.rollNumber || '',
    r.user?.name || '',
    r.user?.email || '',
    r.status,
    r.remark || '',
  ]) || []

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_${session.subjectName || 'class'}_${new Date(session.date).toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function exportAllSessionsCSV(sessions: SessionSummary[]) {
  const headers = ['Date', 'Subject Code', 'Subject Name', 'Total', 'Present', 'Absent', 'Taken By']
  const rows = sessions.map(s => [
    new Date(s.date).toLocaleDateString('en-IN'),
    s.subjectCode || '',
    s.subjectName || 'General',
    s.totalStudents,
    s.presentCount,
    s.absentCount,
    s.takenBy?.name || 'Unknown',
  ])

  const csv = [headers, ...rows].map(row =>
    row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')
  ).join('\n')

  const blob = new Blob([csv], { type: 'text/csv' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `attendance_summary_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function StatCard({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center gap-2 mb-1">
        <Icon className={`h-4 w-4 ${color}`} />
        <span className="text-xs font-semibold text-muted-foreground">{label}</span>
      </div>
      <p className="text-xl font-bold">{value}</p>
    </div>
  )
}
