'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Users, Crown, Mail, Loader2, Flame, Zap, Info, Megaphone, Clock,
  Pin, PinOff, Pencil, Trash2, ShieldCheck, ChevronRight, Sparkles, X,
  BarChart3,
} from 'lucide-react'
import { ClassAvatar } from '@/components/class/class-avatar'
import { ClassIdentityEditor } from '@/components/class/class-identity-editor'
import {
  AnnouncementCard,
  AnnouncementComposer,
  type AnnouncementData,
} from '@/components/class/announcement'

type Tab = 'overview' | 'announcements' | 'polls' | 'timetable'

interface ClassData {
  id: string
  departmentCode: string
  semesterNumber: number
  division: string
  academicYear: string | null
  alias?: string | null
  avatarEmoji?: string | null
  avatarColor?: string | null
  room?: string | null
  cr?: {
    id: string
    name: string
    email: string
    rollNumber: string | null
  } | null
  members: Array<{
    id: string
    userId: string
    user: {
      id: string
      name: string
      email: string
      rollNumber: string | null
      xp: number
      streak: number
      role: string
    }
  }>
  announcements?: AnnouncementData[]
  todaySlots?: Array<{
    id: string
    subjectName: string | null
    startTime: string
    endTime: string
    room: string | null
    isBreak: boolean
  }>
}

export function ClassClient({ userRole, userId }: { userRole: string; userId: string }) {
  const [classData, setClassData] = useState<ClassData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [tab, setTab] = useState<Tab>('overview')

  const fetchClass = useCallback(() => {
    fetch('/api/class?action=my-class')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setClassData(data.data)
        } else {
          setError(data.error || 'Failed to load class')
        }
      })
      .catch(() => setError('Failed to load class'))
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    fetchClass()
  }, [fetchClass])

  const fetchAnnouncements = useCallback(() => {
    fetch('/api/class/announcements')
      .then((r) => r.json())
      .then((data) => {
        if (data.ok && classData) {
          setClassData({ ...classData, announcements: data.data })
        }
      })
      .catch(() => {})
  }, [classData])

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    )
  }

  if (error) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <p className="text-sm text-muted-foreground">{error}</p>
      </div>
    )
  }

  if (!classData) {
    return (
      <div className="rounded-xl border border-border bg-card p-8 text-center">
        <Users className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No class assigned yet. Complete your profile to join a class.
        </p>
      </div>
    )
  }

  const members = classData.members || []
  const cr = classData.cr
  const alias = classData.alias?.trim()
  const isStaff = userRole === 'admin' || userRole === 'coordinator' || userRole === 'teacher'
  const isCR = userRole === 'cr'
  const canModerate = isStaff || isCR
  const canEditIdentity = isStaff || (isCR && cr?.id === userId)

  return (
    <div className="space-y-5">
      {/* Class Info Header */}
      <div className="rounded-xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <ClassAvatar
            emoji={classData.avatarEmoji || undefined}
            color={classData.avatarColor || undefined}
            division={classData.division}
            semesterNumber={classData.semesterNumber}
            size="lg"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <h2 className="text-xl font-bold leading-tight">
                  {alias || `Division ${classData.division}`}
                </h2>
                {alias && (
                  <p className="text-xs text-muted-foreground">
                    {classData.departmentCode} · Semester {classData.semesterNumber} · Division {classData.division}
                  </p>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {members.length} {members.length === 1 ? 'student' : 'students'}
                  </span>
                  {classData.academicYear && <span>AY {classData.academicYear}</span>}
                  {classData.room && <span>Room {classData.room}</span>}
                </div>
              </div>
              <ClassIdentityEditor
                classData={classData}
                canEdit={canEditIdentity}
                onSaved={(updated) => {
                  setClassData({
                    ...classData,
                    alias: updated.alias,
                    avatarEmoji: updated.avatarEmoji,
                    avatarColor: updated.avatarColor,
                  })
                }}
              />
            </div>
          </div>
        </div>

        {/* CR Info */}
        {cr && (
          <div className="mt-4 flex items-center gap-3 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-500/10">
              <Crown className="h-4 w-4 text-amber-500" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-xs font-bold uppercase text-amber-500">Class Representative</p>
              <p className="text-sm font-semibold">{cr.name}</p>
            </div>
            <a
              href={`mailto:${cr.email}`}
              className="text-muted-foreground hover:text-primary"
              title="Email CR"
            >
              <Mail className="h-4 w-4" />
            </a>
          </div>
        )}
      </div>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 border-b border-border">
        {[
          { id: 'overview' as Tab, label: 'Overview', icon: Info },
          { id: 'announcements' as Tab, label: 'Announcements', icon: Megaphone },
          { id: 'polls' as Tab, label: 'Polls', icon: BarChart3 },
          { id: 'timetable' as Tab, label: "Today's Classes", icon: Clock },
        ].map((t) => {
          const Icon = t.icon
          const active = tab === t.id
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`relative inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors ${
                active ? 'text-primary' : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              <Icon className="h-3.5 w-3.5" />
              {t.label}
              {active && <span className="absolute inset-x-0 -bottom-px h-0.5 bg-primary" />}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <div className="space-y-4">
          {/* Today's classes widget */}
          <div className="rounded-xl border border-border bg-card p-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold">
              <Clock className="h-4 w-4 text-primary" /> Today&apos;s classes
            </h3>
            {(!classData.todaySlots || classData.todaySlots.length === 0) ? (
              <p className="mt-2 text-xs text-muted-foreground">No classes scheduled for today.</p>
            ) : (
              <div className="mt-3 space-y-1.5">
                {classData.todaySlots.map((s) => (
                  <div
                    key={s.id}
                    className={`flex items-center gap-3 rounded-md border px-3 py-1.5 ${
                      s.isBreak ? 'border-dashed border-border bg-muted/20' : 'border-border bg-background'
                    }`}
                  >
                    <div className="flex flex-col text-[10px] font-medium text-muted-foreground w-12">
                      <span>{s.startTime}</span>
                      <span>{s.endTime}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {s.isBreak ? <em className="text-muted-foreground">Break</em> : (s.subjectName || '—')}
                      </p>
                      {s.room && <p className="text-[10px] text-muted-foreground">Room {s.room}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recent announcements preview */}
          <div className="rounded-xl border border-border bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="flex items-center gap-2 text-sm font-semibold">
                <Megaphone className="h-4 w-4 text-primary" /> Recent announcements
              </h3>
              <button
                onClick={() => setTab('announcements')}
                className="text-xs text-primary hover:underline"
              >
                View all →
              </button>
            </div>
            {(!classData.announcements || classData.announcements.length === 0) ? (
              <p className="text-xs text-muted-foreground">No announcements yet.</p>
            ) : (
              <div className="space-y-1.5">
                {classData.announcements.slice(0, 3).map((a) => (
                  <div key={a.id} className="rounded-md border border-border bg-background px-2.5 py-1.5">
                    <p className="truncate text-xs font-medium">{a.title}</p>
                    <p className="text-[10px] text-muted-foreground">
                      by {a.author.name} · {new Date(a.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Classmates list */}
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase text-muted-foreground">
              Classmates ({members.length})
            </h3>
            <div className="space-y-2">
              {members.map((m) => (
                <div
                  key={m.id}
                  className={`flex items-center gap-3 rounded-lg border p-3 transition-colors ${
                    m.user.role === 'cr'
                      ? 'border-amber-500/30 bg-amber-500/5'
                      : 'border-border bg-card hover:bg-accent/5'
                  }`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                    {(m.user.name || '?').charAt(0).toUpperCase()}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium truncate">{m.user.name}</p>
                      {m.user.role === 'cr' && <Crown className="h-3.5 w-3.5 text-amber-500 shrink-0" />}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">
                      {m.user.rollNumber || m.user.email}
                    </p>
                  </div>
                  <div className="flex items-center gap-3 text-xs">
                    {m.user.streak > 0 && (
                      <span className="flex items-center gap-0.5 text-orange-500 font-medium">
                        <Flame className="h-3 w-3" />{m.user.streak}
                      </span>
                    )}
                    {m.user.xp > 0 && (
                      <span className="flex items-center gap-0.5 text-amber-500 font-medium">
                        <Zap className="h-3 w-3" />{m.user.xp}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab === 'announcements' && (
        <div className="space-y-3">
          {canModerate && <AnnouncementComposer onPosted={fetchAnnouncements} />}
          {(!classData.announcements || classData.announcements.length === 0) ? (
            <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
              <Megaphone className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
              <p className="text-sm font-medium">No announcements yet</p>
              <p className="text-xs text-muted-foreground">
                {canModerate ? 'Post the first one above.' : 'Check back later.'}
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {classData.announcements.map((a) => (
                <AnnouncementCard
                  key={a.id}
                  announcement={a}
                  currentUserId={userId}
                  canModerate={canModerate}
                  onChanged={fetchAnnouncements}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'polls' && (
        <PollsTab classId={classData.id} currentUserId={userId} canModerate={canModerate} />
      )}

      {tab === 'timetable' && (
        <div className="rounded-xl border border-border bg-card p-4">
          <h3 className="flex items-center gap-2 text-sm font-semibold">
            <Clock className="h-4 w-4 text-primary" /> Today&apos;s classes
          </h3>
          {(!classData.todaySlots || classData.todaySlots.length === 0) ? (
            <p className="mt-2 text-xs text-muted-foreground">No classes scheduled for today.</p>
          ) : (
            <div className="mt-3 space-y-1.5">
              {classData.todaySlots.map((s) => (
                <div
                  key={s.id}
                  className={`flex items-center gap-3 rounded-md border px-3 py-2 ${
                    s.isBreak ? 'border-dashed border-border bg-muted/20' : 'border-border bg-background'
                  }`}
                >
                  <div className="flex flex-col text-xs font-medium text-muted-foreground w-14">
                    <span>{s.startTime}</span>
                    <span>{s.endTime}</span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">
                      {s.isBreak ? <em className="text-muted-foreground">Break</em> : (s.subjectName || '—')}
                    </p>
                    {s.room && <p className="text-[10px] text-muted-foreground">Room {s.room}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
          <p className="mt-3 text-[10px] text-muted-foreground">
            Full weekly timetable editing is coming soon. For now, today&apos;s schedule is shown.
          </p>
        </div>
      )}
    </div>
  )
}

// ============================================================================
// Polls Tab — WhatsApp-style class polls
// ============================================================================

interface PollData {
  id: string
  question: string
  options: string[]
  tally: number[]
  totalVotes: number
  myVotes: number[]
  open: boolean
  multipleChoice: boolean
  deadline: string | null
  createdBy: { id: string; name: string; role: string }
  createdAt: string
}

function PollsTab({ classId, currentUserId, canModerate }: { classId: string; currentUserId: string; canModerate: boolean }) {
  const [polls, setPolls] = useState<PollData[]>([])
  const [loading, setLoading] = useState(true)
  const [showComposer, setShowComposer] = useState(false)
  const [question, setQuestion] = useState('')
  const [options, setOptions] = useState<string[]>(['', ''])
  const [multipleChoice, setMultipleChoice] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const fetchPolls = useCallback(() => {
    fetch(`/api/class/polls?classId=${classId}`)
      .then((r) => r.json())
      .then((d) => { if (d.ok) setPolls(d.data) })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [classId])

  useEffect(() => { fetchPolls() }, [fetchPolls])

  const createPoll = async () => {
    const validOptions = options.map((o) => o.trim()).filter(Boolean)
    if (!question.trim() || validOptions.length < 2) {
      setError('Need a question and at least 2 options')
      return
    }
    setBusy(true)
    setError('')
    try {
      const res = await fetch('/api/class/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ classId, question: question.trim(), options: validOptions, multipleChoice }),
      })
      const data = await res.json()
      if (!res.ok || !data.ok) throw new Error(data.error || 'Failed to create poll')
      setQuestion(''); setOptions(['', '']); setMultipleChoice(false); setShowComposer(false)
      fetchPolls()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setBusy(false)
    }
  }

  const vote = async (pollId: string, optionIndex: number) => {
    try {
      await fetch(`/api/class/polls/${pollId}/vote`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ optionIndex }),
      })
      fetchPolls()
    } catch {}
  }

  const closePoll = async (pollId: string) => {
    await fetch(`/api/class/polls/${pollId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ close: true }),
    })
    fetchPolls()
  }

  const deletePoll = async (pollId: string) => {
    if (!confirm('Delete this poll?')) return
    await fetch(`/api/class/polls/${pollId}`, { method: 'DELETE' })
    fetchPolls()
  }

  if (loading) {
    return <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
  }

  return (
    <div className="space-y-3">
      {canModerate && !showComposer && (
        <button
          onClick={() => setShowComposer(true)}
          className="w-full rounded-xl border border-dashed border-border bg-card/50 p-4 text-left text-sm text-muted-foreground hover:bg-accent/30 hover:text-foreground transition-colors"
        >
          + Create a poll…
        </button>
      )}

      {showComposer && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-3">
          <input
            type="text"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question (e.g. 'Reschedule extra lecture?')"
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
            maxLength={300}
            autoFocus
          />
          <div className="space-y-2">
            {options.map((opt, i) => (
              <div key={i} className="flex items-center gap-2">
                <input
                  type="text"
                  value={opt}
                  onChange={(e) => { const next = [...options]; next[i] = e.target.value; setOptions(next) }}
                  placeholder={`Option ${i + 1}`}
                  className="flex-1 rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary"
                  maxLength={100}
                />
                {options.length > 2 && (
                  <button onClick={() => setOptions(options.filter((_, idx) => idx !== i))} className="text-muted-foreground hover:text-red-500">
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
          </div>
          {options.length < 6 && (
            <button onClick={() => setOptions([...options, ''])} className="text-xs text-primary hover:underline">+ Add option</button>
          )}
          <label className="flex items-center gap-2 text-xs">
            <input type="checkbox" checked={multipleChoice} onChange={(e) => setMultipleChoice(e.target.checked)} />
            <span>Allow multiple selections</span>
          </label>
          {error && <p className="text-xs text-red-500">{error}</p>}
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowComposer(false); setQuestion(''); setOptions(['', '']); setError('') }} className="rounded-md border border-border px-3 py-1.5 text-xs">Cancel</button>
            <button onClick={createPoll} disabled={busy} className="rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-primary-foreground hover:bg-primary/90 disabled:opacity-50">
              {busy ? 'Creating…' : 'Create poll'}
            </button>
          </div>
        </div>
      )}

      {polls.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card/50 p-8 text-center">
          <BarChart3 className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
          <p className="text-sm font-medium">No polls yet</p>
          <p className="text-xs text-muted-foreground">{canModerate ? 'Create one above to get your class voting.' : 'Check back later.'}</p>
        </div>
      ) : (
        <div className="space-y-3">
          {polls.map((poll) => {
            const maxTally = Math.max(1, ...poll.tally)
            const isCreator = poll.createdBy.id === currentUserId
            return (
              <div key={poll.id} className="rounded-xl border border-border bg-card p-4">
                <div className="flex items-start justify-between gap-2 mb-3">
                  <div>
                    <p className="text-sm font-bold">{poll.question}</p>
                    <p className="text-[10px] text-muted-foreground">
                      by {poll.createdBy.name} · {new Date(poll.createdAt).toLocaleDateString()} · {poll.totalVotes} vote{poll.totalVotes === 1 ? '' : 's'}
                    </p>
                  </div>
                  <div className="flex gap-1">
                    {!poll.open && <span className="rounded-full bg-muted px-2 py-0.5 text-[9px] font-bold uppercase">Closed</span>}
                    {(isCreator || canModerate) && poll.open && (
                      <button onClick={() => closePoll(poll.id)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-foreground text-[10px]">Close</button>
                    )}
                    {(isCreator || canModerate) && (
                      <button onClick={() => deletePoll(poll.id)} className="rounded p-1 text-muted-foreground hover:bg-accent hover:text-red-500">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>
                <div className="space-y-2">
                  {poll.options.map((opt, i) => {
                    const count = poll.tally[i] || 0
                    const pct = poll.totalVotes > 0 ? Math.round((count / poll.totalVotes) * 100) : 0
                    const mine = poll.myVotes.includes(i)
                    return (
                      <button
                        key={i}
                        onClick={() => poll.open && vote(poll.id, i)}
                        disabled={!poll.open}
                        className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition-all ${
                          mine ? 'border-primary bg-primary/5' : 'border-border bg-background hover:bg-accent/30'
                        } ${!poll.open ? 'cursor-default' : 'cursor-pointer'}`}
                      >
                        <div
                          className="absolute inset-y-0 left-0 bg-primary/10 transition-all"
                          style={{ width: `${(count / maxTally) * 100}%` }}
                        />
                        <div className="relative flex items-center justify-between">
                          <span className="font-medium">{opt}</span>
                          <span className="text-xs text-muted-foreground">
                            {mine && <span className="mr-1 text-primary">✓</span>}
                            {count} · {pct}%
                          </span>
                        </div>
                      </button>
                    )
                  })}
                </div>
                {!poll.open && <p className="mt-2 text-[10px] text-muted-foreground italic">Poll closed · {poll.totalVotes} total votes</p>}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
